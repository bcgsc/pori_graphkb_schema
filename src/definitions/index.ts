/**
 * Repsonsible for defining the schema.
 * @module schema
 */
import omit from 'lodash.omit';

import { PERMISSIONS, EXPOSE_READ } from '../constants';
import { ClassModel } from '../class';
import { timeStampNow } from '../util';
import { defineSimpleIndex, BASE_PROPERTIES, activeUUID } from './util';
import edges from './edges';
import ontology from './ontology';
import position from './position';
import statement from './statement';
import variant from './variant';
import user from './user';
import { ModelTypeDefinition } from '../types';

const BASE_SCHEMA: Record<string, ModelTypeDefinition> = {
    V: {
        description: 'Vertices',
        routes: EXPOSE_READ,
        isAbstract: true,
        properties: [
            { ...BASE_PROPERTIES['@rid'] },
            { ...BASE_PROPERTIES['@class'] },
            { ...BASE_PROPERTIES.uuid },
            { ...BASE_PROPERTIES.createdAt },
            { ...BASE_PROPERTIES.createdBy },
            { ...BASE_PROPERTIES.updatedAt },
            { ...BASE_PROPERTIES.updatedBy },
            { ...BASE_PROPERTIES.deletedAt },
            { ...BASE_PROPERTIES.deletedBy },
            { ...BASE_PROPERTIES.history },
            { name: 'comment', type: 'string' },
            { ...BASE_PROPERTIES.groupRestrictions },
        ],
        indices: [
            activeUUID('V'),
            defineSimpleIndex({ model: 'V', property: 'createdAt' }),
            defineSimpleIndex({ model: 'V', property: 'updatedAt' }),
        ],
    },
    Evidence: {
        routes: EXPOSE_READ,
        description: 'Classes which can be used as support for statements',
        isAbstract: true,
    },
    Biomarker: {
        routes: EXPOSE_READ,
        isAbstract: true,
    },
    Source: {
        permissions: {
            default: PERMISSIONS.READ,
            admin: PERMISSIONS.ALL,
            regular: PERMISSIONS.CREATE | PERMISSIONS.UPDATE | PERMISSIONS.READ,
            manager: PERMISSIONS.CREATE | PERMISSIONS.UPDATE | PERMISSIONS.READ,
        },
        description: 'External database, collection, or other authority which is used as reference for other entries',
        inherits: ['V', 'Evidence'],
        properties: [
            {
                name: 'name',
                mandatory: true,
                nullable: false,
                description: 'Name of the source',
            },
            {
                name: 'longName',
                description: 'More descriptive name if applicable. May be the expansion of the name acronym',
                examples: ['Disease Ontology (DO)'],
            },
            { name: 'version', description: 'The source version' },
            { name: 'url', type: 'string' },
            { name: 'description', type: 'string' },
            {
                name: 'usage',
                description: 'Link to the usage/licensing information associated with this source',
            },
            {
                name: 'license',
                description: 'content of the license agreement (if non-standard)',
            },
            {
                name: 'licenseType',
                description: 'standard license type',
                examples: ['MIT'],
            },
            {
                name: 'citation',
                description: 'link or information about how to cite this source',
            },
            {
                name: 'sort',
                description: 'Used in ordering the sources for auto-complete on the front end. Lower numbers indicate the source should be higher in the sorting',
                examples: [1],
                type: 'integer',
                default: 99999,
            },
            { ...BASE_PROPERTIES.displayName },
        ],
        indices: [
            {
                name: 'Source.active',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
                properties: ['name', 'version', 'deletedAt'],
                class: 'Source',
            },
            {
                name: 'Source.name',
                type: 'NOTUNIQUE',
                properties: ['name'],
                class: 'Source',
            },
        ],
    },
    LicenseAgreement: {
        permissions: {
            default: PERMISSIONS.READ,
            admin: PERMISSIONS.ALL,
            regular: PERMISSIONS.READ,
            manager: PERMISSIONS.READ,
        },
        properties: [
            {
                name: 'enactedAt',
                type: 'long',
                mandatory: true,
                nullable: false,
                description: 'The timestamp at which this terms of use was put into action',
                default: timeStampNow,
                generated: true,
                examples: [1547245339649],
            }, {
                name: 'content',
                type: 'embeddedlist',
                nullable: false,
                mandatory: true,
            },
        ],
    },
};

/**
 * Given a raw json-like object, initialize the schema definition to add
 * linking between classes and wrapper class/property models
 */
const initializeSchema = (
    inputSchema: Record<string, ModelTypeDefinition>,
): Record<string, ClassModel> => {
    // initialize the models
    const schema = { ...inputSchema };

    for (const name of Object.keys(schema)) {
        if (name !== 'Permissions' && !schema[name].embedded && schema.Permissions !== undefined) {
            if (schema.Permissions.properties === undefined) {
                schema.Permissions = {
                    ...schema.Permissions,
                    properties: [{
                        min: PERMISSIONS.NONE, max: PERMISSIONS.ALL, type: 'integer', nullable: false, readOnly: false, name,
                    }],
                };
            } else {
                schema.Permissions.properties.push({
                    min: PERMISSIONS.NONE, max: PERMISSIONS.ALL, type: 'integer', nullable: false, readOnly: false, name,
                });
            }
        }
    }

    const models: Record<string, ClassModel> = {};

    // build the model objects
    for (const [modelName, model] of Object.entries(schema)) {
        const {
            inherits, properties, ...modelOptions
        } = model;
        // for each fast index, mark the field as searchable
        const indexed = new Set();
        const fulltext = new Set();

        for (const index of model.indices || []) {
            if (index.properties.length === 1) {
                const [propertyName] = index.properties;

                if (index.type === 'NOTUNIQUE_HASH_INDEX') {
                    indexed.add(propertyName);
                } else if (index.type === 'FULLTEXT_HASH_INDEX' || index.type.includes('LUCENE')) {
                    fulltext.add(propertyName);
                }
            }
        }

        models[modelName] = new ClassModel({
            properties: (model.properties || []).map((prop) => ({
                ...omit(prop, ['linkedClass']),
                indexed: indexed.has(prop.name),
                fulltextIndexed: fulltext.has(prop.name),
            })),
            ...modelOptions,
            name: modelName,
        });
    }

    // link the inherited models and linked models
    for (const [modelName, defn] of Object.entries(schema)) {
        const model = models[modelName];

        // fill the _inherits and subclasses properties
        for (const parent of defn.inherits || []) {
            if (models[parent] === undefined) {
                throw new Error(`Schema definition error. Expected model ${parent} is not defined`);
            }
            models[model.name]._inherits.push(models[parent]);
            models[parent].subclasses.push(models[model.name]);
        }

        // resolve the linked class
        for (const prop of defn.properties || []) {
            if (prop.linkedClass) {
                if (models[prop.linkedClass] === undefined) {
                    throw new Error(`Schema definition error. Expected model ${prop.linkedClass} is not defined`);
                }
                model._properties[prop.name].linkedClass = models[prop.linkedClass];
            }
        }
    }
    return models;
};

const mergeDefinitions = (defns: Record<string, ModelTypeDefinition>[]) => {
    const merge: Record<string, ModelTypeDefinition> = {};

    for (const defn of defns) {
        for (const key of Object.keys(defn)) {
            if (merge[key] !== undefined) {
                throw Error(`Invalid schema definitions. Duplicate key (${key})`);
            }
            merge[key] = defn[key];
        }
    }
    return merge;
};

export default initializeSchema(mergeDefinitions([
    BASE_SCHEMA, edges, position, statement, variant, user, ontology,
]));
