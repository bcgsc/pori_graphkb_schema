/**
 * Classes for enforcing constraints on DB classes and properties
 * @module model
 */

import { AttributeError } from './error';
import {
    EXPOSE_ALL, EXPOSE_EDGE, EXPOSE_NONE, Expose,
} from './constants';
import { defaultPermissions } from './util';
import {
    defineProperty, DefinePropertyOptions, validateProperty,
} from './property';
import {
    Index, Property, ClassModelType, FormatRecordOptions, Schema,
} from './types';

interface ClassModelInputs {
    description: string;
    embedded?: boolean;
    routes: Expose;
    inherits?: string[];
    isAbstract?: boolean;
    properties: Record<string, Omit<DefinePropertyOptions, 'name'>>;
    name: string;
    isEdge?: boolean;
    reverseName?: string;
    sourceModel?: string;
    targetModel?: string;
    permissions: Expose;
    indices?: Index[];
    uniqueNonIndexedProps: string[];
    subclasses: string[];
}

export class ClassModel implements ClassModelType {
    readonly description: string;
    readonly embedded: boolean;
    readonly routes: Expose;
    readonly _inherits: string[];
    readonly isAbstract: boolean;
    readonly _properties: Record<string, Property> = {};
    readonly name: string;
    readonly isEdge: boolean;
    readonly reverseName: string;
    readonly sourceModel: string | null;
    readonly targetModel: string | null;
    readonly permissions: Expose;
    readonly indices: Index[];
    readonly uniqueNonIndexedProps: string[];

    /**
     * @param name the class name
     * @param inherits the models this model inherits from
     * @param isAbstract this is an abstract class
     * @param properties mapping by attribute name to property objects (defined by orientjs)
     * @param routes the routes to routes to the API for this class
     * @param embedded this class owns no records and is used as part of other class records only
     * @param targetModel the model edges incoming vertices are restricted to
     * @param sourceModel the model edges outgoing vertices are restricted to
     * @param uniqueNonIndexedProps the properties which in combination are expected to be unique (used in building select queries)
     */
    constructor(opt: ClassModelInputs) {
        this.name = opt.name;
        this.description = opt.description || '';
        this._inherits = opt.inherits || [];
        this.isEdge = Boolean(opt.isEdge || false);
        this.targetModel = opt.targetModel || null;
        this.sourceModel = opt.sourceModel || null;

        if (this.targetModel || this.sourceModel) {
            this.isEdge = true;
        }
        this.embedded = Boolean(opt.embedded);
        this.reverseName = opt.reverseName || opt.name;
        this.isAbstract = Boolean(opt.isAbstract);

        if (this.isAbstract || this.embedded) {
            this.routes = { ...EXPOSE_NONE, ...opt.routes };
        } else if (this.isEdge) {
            this.routes = { ...EXPOSE_EDGE, ...opt.routes };
        } else {
            this.routes = { ...EXPOSE_ALL, ...opt.routes };
        }
        // use routing defaults to set permissions defaults

        // override defaults if specific permissions are given
        this.permissions = {
            ...defaultPermissions(this.routes),
            ...(opt.permissions || {}),
        };

        this.indices = opt.indices || [];
        this._properties = {};

        for (const [propName, prop] of Object.entries(opt.properties)) {
            this._properties[propName] = defineProperty({ ...prop, name: propName });
        }
        this.uniqueNonIndexedProps = opt.uniqueNonIndexedProps;
    }

    /**
     * the default route name for this class
     * @type {string}
     */
    get routeName(): string {
        if (this.name.length === 1) {
            return `/${this.name.toLowerCase()}`;
        } if (!this.isEdge && !this.name.endsWith('ary') && this.name.toLowerCase() !== 'evidence') {
            if (/.*[^aeiou]y$/.exec(this.name)) {
                return `/${this.name.slice(0, this.name.length - 1)}ies`.toLowerCase();
            }
            return `/${this.name}s`.toLowerCase();
        }
        return `/${this.name.toLowerCase()}`;
    }

    subclasses(schema: Schema): ClassModelType[] {
        const subclasses = {};

        for (const model of Object.values(schema)) {
            const parents = model.ancestors(schema);

            if (parents.some((p) => p.name === this.name)) {
                subclasses[model.name] = model;
            }
        }
        return Object.values(subclasses);
    }

    /**
     * List of parent models this model inherits from
     */
    ancestors(schema: Schema) {
        const parents: ClassModelType[] = [];

        for (const modelName of this._inherits) {
            const model = schema[modelName];
            parents.push(model);
            parents.push(...model.ancestors(schema));
        }
        return parents;
    }

    /**
     * Returns the list of properties for the Class.active index. This is
     * expected to represent a unique constraint on a combination of these properties
     *
     * @returns {Array.<string>} list of properties which belong to the index
     */
    getActiveProperties() {
        for (const index of this.indices) {
            if (index.name === `${this.name}.active`) {
                return index.properties;
            }
        }
        return null;
    }

    /**
     * Given the name of a subclass, retrieve the subclass model or throw an error if it is not
     * found
     *
     * @param {string} modelName the name of the model to find as a subclass
     * @throws {Error} if the subclass was not found
     */
    subClassModel(schema: Schema, modelName: string): ClassModelType {
        for (const subclass of this.subclasses(schema)) {
            if (subclass.name === modelName) {
                return subclass;
            }

            try {
                return subclass.subClassModel(schema, modelName);
            } catch (err) {}
        }
        throw new Error(`The subclass (${
            modelName
        }) was not found as a subclass of the current model (${
            this.name
        })`);
    }

    /**
     * Get a list of models (including the current model) for all descendants of the current model
     *
     * @param excludeAbstract exclude abstract models
     *
     * @returns the array of descendant models
     */
    descendantTree(schema: Schema, excludeAbstract = false): ClassModelType[] {
        const descendants: ClassModelType[] = [this, ...this.subclasses(schema)];

        return descendants
            .filter((model) => !excludeAbstract || !model.isAbstract);
    }

    /**
     * Returns a set of properties from this class and all subclasses
     */
    queryProperties(schema: Schema): Record<string, Property> {
        const queryProps = this.properties(schema);

        for (const currModel of this.subclasses(schema)) {
            for (const prop of Object.values(currModel.properties(schema))) {
                if (queryProps[prop.name] === undefined) { // first model to declare is used
                    queryProps[prop.name] = prop;
                }
            }
        }
        return queryProps;
    }

    /**
     * a list of property names for all required properties
     */
    required(schema: Schema) {
        const required = Array.from(Object.values(this.properties(schema)).filter(
            (prop) => prop.mandatory,
        ), (prop) => prop.name);

        return required;
    }

    /**
     * a list of property names for all optional properties
     */
    optional(schema: Schema) {
        const optional = Array.from(
            Object.values(this.properties(schema)).filter((prop) => !prop.mandatory),
            (prop) => prop.name,
        );
        return optional;
    }

    /**
     * Check if this model inherits a property from a parent model
     */
    inheritsProperty(schema: Schema, propName: string) {
        for (const modelName of this._inherits) {
            const model = schema[modelName];

            if (model._properties[propName] !== undefined) {
                return true;
            }
            if (model.inheritsProperty(schema, propName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * properties associated with this class or parents of this class
     */
    properties(schema: Schema): Record<string, Property> {
        let properties = { ...this._properties };

        for (const parentModel of this.ancestors(schema)) {
            // properties of the same name are taken from the lowest model
            properties = { ...parentModel.properties, ...properties };
        }
        return properties;
    }

    /**
     * @returns {Object} a partial json representation of the current class model
     */
    toJSON(schema: Schema) {
        const json: {
            properties: Record<string, Property>;
            inherits: string[];
            isEdge: boolean;
            name: string;
            isAbstract: boolean;
            embedded: boolean;
            reverseName?: string;
            route?: string;
        } = {
            properties: this.properties(schema),
            inherits: this.ancestors(schema).map((m) => m.name),
            isEdge: !!this.isEdge,
            name: this.name,
            isAbstract: this.isAbstract,
            embedded: this.embedded,
        };

        if (this.reverseName) {
            json.reverseName = this.reverseName;
        }
        if (Object.values(this.routes).some((x) => x)) {
            json.route = this.routeName;
        }
        return json;
    }

    /**
     * Checks a single record to ensure it matches the expected pattern for this class model
     *
     * @param {Object} record the record to be checked
     * @param {Object} opt options
     * @param {boolean} [opt.dropExtra=true] drop any record attributes that are not defined on the current class model by either required or optional
     * @param {boolean} [opt.addDefaults=false] add default values for any attributes not given (where defined)
     * @param {boolean} [opt.ignoreMissing=false] do not throw an error when a required attribute is missing
     * @param {boolean} [opt.ignoreExtra=false] do not throw an error when an unexpected value is given
     */
    formatRecord(record, opt: FormatRecordOptions = {}) {
        // add default options
        const {
            dropExtra = true,
            addDefaults = true,
            ignoreExtra = false,
            ignoreMissing = false,
        } = opt;
        const formattedRecord = dropExtra
            ? {}
            : { ...record };
        const { properties } = this;

        if (!ignoreExtra && !dropExtra) {
            for (const attr of Object.keys(record)) {
                if (this.isEdge && (attr === 'out' || attr === 'in')) {
                    continue;
                }
                if (properties[attr] === undefined) {
                    throw new AttributeError(`[${this.name}] unexpected attribute: ${attr}`);
                }
            }
        }
        // if this is an edge class, check the to and from attributes
        if (this.isEdge) {
            if (record.out) {
                formattedRecord.out = record.out;
            } else if (!ignoreMissing) {
                throw new AttributeError(`[${this.name}] missing required attribute out`);
            }
            if (record.in) {
                formattedRecord.in = record.in;
            } else if (!ignoreMissing) {
                throw new AttributeError(`[${this.name}] missing required attribute in`);
            }
        }

        // add the non generated (from other properties) attributes
        for (const prop of Object.values(properties)) {
            if (addDefaults && record[prop.name] === undefined && !prop.generationDependencies) {
                if (prop.default !== undefined) {
                    formattedRecord[prop.name] = prop.default;
                } else if (prop.generateDefault) {
                    formattedRecord[prop.name] = prop.generateDefault();
                }
            }
            // check that the required attributes are there
            if (prop.mandatory) {
                if (record[prop.name] === undefined && ignoreMissing) {
                    continue;
                }
                if (record[prop.name] !== undefined) {
                    formattedRecord[prop.name] = record[prop.name];
                }
                if (formattedRecord[prop.name] === undefined && !ignoreMissing) {
                    throw new AttributeError(`[${this.name}] missing required attribute ${prop.name}`);
                }
            } else if (record[prop.name] !== undefined) {
                // add any optional attributes that were specified
                formattedRecord[prop.name] = record[prop.name];
            }
            // try the casting
            if (formattedRecord[prop.name] !== undefined) {
                formattedRecord[prop.name] = validateProperty(prop, formattedRecord[prop.name]);
            }
        }

        // look for linked models
        for (let [attr, value] of Object.entries(formattedRecord)) {
            let { linkedClass, type, iterable } = properties[attr];

            if (type.startsWith('embedded') && linkedClass && value) {
                if (value['@class'] && value['@class'] !== linkedClass.name) {
                    linkedClass = linkedClass.subClassModel(value['@class']);
                }
                if (type === 'embedded' && typeof value === 'object') {
                    value = linkedClass.formatRecord(value);
                } else if (iterable) {
                    value = Array.from(value, (v) => linkedClass.formatRecord(v));
                }
            }
            formattedRecord[attr] = value;
        }

        // create the generated attributes
        if (addDefaults) {
            for (const prop of Object.values(properties)) {
                if (prop.generationDependencies
                && prop.generateDefault
                && (prop.generated || formattedRecord[prop.name] === undefined)
                ) {
                    formattedRecord[prop.name] = prop.generateDefault(formattedRecord);
                }
            }
        }
        return formattedRecord;
    }
}
