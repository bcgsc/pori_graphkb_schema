/**
 * Repsonsible for defining the schema.
 * @module schema
 */
const omit = require('lodash.omit');


const {
    PERMISSIONS, EXPOSE_READ,
} = require('../constants');
const { ClassModel } = require('../model');
const { Property } = require('../property');
const {
    defineSimpleIndex, BASE_PROPERTIES, activeUUID, timeStampNow,
} = require('./util');

const edges = require('./edges');
const ontology = require('./ontology');
const position = require('./position');
const statement = require('./statement');
const variant = require('./variant');
const user = require('./user');


const BASE_SCHEMA = {
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
            { ...BASE_PROPERTIES.deletedAt },
            { ...BASE_PROPERTIES.deletedBy },
            { ...BASE_PROPERTIES.history },
            { name: 'comment', type: 'string' },
            { ...BASE_PROPERTIES.groupRestrictions },
        ],
        identifiers: ['@class', '@rid', 'displayName'],
        indices: [activeUUID('V'), defineSimpleIndex({ model: 'V', property: 'createdAt' })],
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
                example: 'Disease Ontology (DO)',
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
                example: 'MIT',
            },
            {
                name: 'citation',
                description: 'link or information about how to cite this source',
            },
            {
                name: 'sort',
                description: 'Used in ordering the sources for auto-complete on the front end. Lower numbers indicate the source should be higher in the sorting',
                example: 1,
                type: 'integer',
                default: 99999,
            },
            { ...BASE_PROPERTIES.displayName },
        ],
        indices: [
            {
                name: 'Source.active',
                type: 'unique',
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
        identifiers: ['name', '@rid'],
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
                example: 1547245339649,
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
const initializeSchema = (schema) => {
    // initialize the models
    for (const name of Object.keys(schema)) {
        if (name !== 'Permissions' && !schema[name].embedded) {
            schema.Permissions.properties.push({
                min: PERMISSIONS.NONE, max: PERMISSIONS.ALL, type: 'integer', nullable: false, readOnly: false, name,
            });
        }
    }
    const models = {};

    for (const [name, model] of Object.entries(schema)) {
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
        model.name = name;
        const properties = {};

        for (const prop of model.properties || []) {
            properties[prop.name] = new Property({
                ...prop,
                indexed: indexed.has(prop.name),
                fulltextIndexed: fulltext.has(prop.name),
            });
        }
        models[name] = new ClassModel({ properties, ...omit(model, ['inherits', 'properties']) });
    }

    // link the inherited models and linked models
    for (const model of Object.values(models)) {
        const defn = schema[model.name];

        for (const parent of defn.inherits || []) {
            if (models[parent] === undefined) {
                throw new Error(`Schema definition error. Expected model ${parent} is not defined`);
            }
            models[model.name]._inherits.push(models[parent]);
            models[parent].subclasses.push(models[model.name]);
        }

        for (const prop of Object.values(model._properties)) {
            if (prop.linkedClass) {
                if (models[prop.linkedClass] === undefined) {
                    throw new Error(`Schema definition error. Expected model ${prop.linkedClass} is not defined`);
                }
                prop.linkedClass = models[prop.linkedClass];
            }
        }
    }
    return { ...schema, ...models };
};


const mergeDefinitions = (defns) => {
    const merge = {};

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


module.exports = initializeSchema(mergeDefinitions([
    BASE_SCHEMA, edges, position, statement, variant, user, ontology,
]));
