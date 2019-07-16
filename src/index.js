const {ClassModel} = require('./model');
const {Property} = require('./property');
const schema = require('./schema');
const util = require('./util');
const error = require('./error');
const constants = require('./constants');


class SchemaDefinition {
    constructor(models) {
        this.schema = models;
        this.normalizedModelNames = {};
        Object.keys(this.schema).forEach((name) => {
            const model = this.schema[name];
            this.normalizedModelNames[name.toLowerCase()] = model;
            if (model.reverseName) {
                this.normalizedModelNames[model.reverseName.toLowerCase()] = model;
            }
        });
    }

    /**
     * Check that a given class/model name exists
     */
    has(obj) {
        try {
            return Boolean(this.get(obj));
        } catch (err) {
            return false;
        }
    }

    /**
     * Returns Knowledgebase class schema.
     * @param {Object|string} obj - Record to fetch schema of.
     */
    get(obj) {
        let cls = obj;
        if (obj && typeof obj === 'object' && obj['@class']) {
            cls = obj['@class'];
        }
        return this.normalizedModelNames[typeof cls === 'string'
            ? cls.toLowerCase()
            : cls
        ] || null;
    }

    getFromRoute(routeName) {
        for (const model of Object.values(this.schema)) {  // eslint-disable-line
            if (model.routeName === routeName) {
                return model;
            }
        }
        throw new Error(`Missing model corresponding to route (${routeName})`);
    }
}

module.exports = {
    ClassModel, Property, schema: new SchemaDefinition(schema), util, error, constants
};
