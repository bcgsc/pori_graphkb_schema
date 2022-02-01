import { ClassModel } from './model';
import { Property } from './property';
import schema from './schema';
import * as util from './util';
import * as error from './error';
import * as constants from './constants';

import * as sentenceTemplates from './sentenceTemplates';

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

    getModels() {
        return Object.values(this.schema);
    }

    getEdgeModels() {
        return this.getModels().filter(model => model.isEdge);
    }

    /**
    * Returns preview of given record based on its '@class' value
    * @param {Object} obj - Record to be parsed.
    */
    getPreview(obj) {
        if (obj) {
            if (obj['@class'] === 'Statement') {
                const { content } = sentenceTemplates.generateStatementSentence(this, obj);
                return content;
            }

            if (obj.displayName) {
                return obj.displayName;
            }
            if (obj.name) {
                return obj.name;
            }
            if (obj['@class']) {
                const label = this.getPreview(this.get(obj));

                if (label) {
                    return label;
                }
            }
            if (obj['@rid']) {
                return obj['@rid'];
            }
            if (Array.isArray(obj)) { // embedded link set
                return obj.length;
            }
            if (obj.target) {
                // preview pseudo-edge objects
                return this.getPreview(obj.target);
            }
        }
        return obj;
    }
}

const schemaDef = new SchemaDefinition(schema);

export {
    ClassModel,
    Property,
    schemaDef as schema,
    util,
    error,
    constants,
    sentenceTemplates,
};
