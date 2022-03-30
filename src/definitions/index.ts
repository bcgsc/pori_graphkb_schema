/**
 * Responsible for defining the schema.
 */
import { PERMISSIONS, EXPOSE_READ, EXPOSE_NONE } from '../constants';
import { timeStampNow } from '../util';
import { defineSimpleIndex, BASE_PROPERTIES, activeUUID } from './util';
import edges from './edges';
import ontology from './ontology';
import position from './position';
import statement from './statement';
import variant from './variant';
import user from './user';
import {
    ClassDefinitionInput, PropertyDefinitionInput, ClassDefinition, PartialSchemaDefn,
} from '../types';
import { createClassDefinition } from '../class';

const BASE_SCHEMA: PartialSchemaDefn = {
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
    inputSchema: Record<string, Omit<ClassDefinitionInput, 'name'>>,
): Record<string, ClassDefinition> => {
    // initialize the models
    const permissionsProperties: PropertyDefinitionInput[] = [];

    for (const name of Object.keys(inputSchema)) {
        if (name !== 'Permissions' && !inputSchema[name].embedded) {
            permissionsProperties.push({
                min: PERMISSIONS.NONE, max: PERMISSIONS.ALL, type: 'integer', nullable: false, readOnly: false, name,
            });
        }
    }

    const models: Record<string, ClassDefinition> = {
        Permissions: createClassDefinition({
            routes: EXPOSE_NONE,
            properties: permissionsProperties,
            name: 'Permissions',
            embedded: true,
        }),
    };

    // build the index/fulltext flags
    for (const [modelName, model] of Object.entries(inputSchema)) {
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

        models[modelName] = createClassDefinition({
            ...model,
            properties: (model.properties || []).map((prop) => ({
                ...prop,
                indexed: indexed.has(prop.name),
                fulltextIndexed: fulltext.has(prop.name),
            })),
            name: modelName,
        });
    }
    return models;
};

const mergeDefinitions = (defns: PartialSchemaDefn[]) => {
    const merge: Record<string, Omit<ClassDefinitionInput, 'name'>> = {};

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

const definitions = initializeSchema(mergeDefinitions([
    BASE_SCHEMA, edges, position, statement, variant, user, ontology,
]));

export default definitions;
