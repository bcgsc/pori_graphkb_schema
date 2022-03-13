/**
 * Classes for enforcing constraints on DB classes and properties
 * @module model
 */
import omit from 'lodash.omit';
import { AttributeError } from './error';
import { EXPOSE_ALL, EXPOSE_EDGE, EXPOSE_NONE } from './constants';
import { defaultPermissions } from './util';
import { Property, PropertyTypeInput } from './property';
import { IndexType, ModelTypeDefinition, GraphRecord } from './types';

interface ModelTypeInput extends Omit<ModelTypeDefinition, 'subclasses' | 'name' | 'inherits' | 'targetModel' | 'sourceModel' | 'properties' > {
    subclasses?: ClassModel[];
    name: string;
    inherits?: ClassModel[];
    targetModel?: string;
    sourceModel?: string;
    properties?: PropertyTypeInput[]
}

export class ClassModel {
    readonly _properties: Record<string, Property>;
    readonly description: string;
    readonly embedded: boolean;
    readonly indices: IndexType[];
    readonly isAbstract: boolean;
    readonly isEdge: boolean;
    readonly name: string;
    readonly permissions: any;
    readonly reverseName: string;
    readonly routes: any;
    readonly sourceModel?: string;
    readonly targetModel?: string;

    // must be initialized after construction
    _inherits: ClassModel[];
    subclasses: ClassModel[];

    /**
     * @param {Object} opt
     * @param {string} opt.name the class name
     * @param {Object.<string,function>} [opt.defaults={}] the mapping of attribute names to functions producing default values
     * @param {ClassModel[]} [opt.inherits=[]] the models this model inherits from
     * @param {boolean} [opt.isAbstract=false] this is an abstract class
     * @param {Object.<string,Object>} [opt.properties={}] mapping by attribute name to property objects (defined by orientjs)
     * @param {Expose} [opt.routes] the routes to routes to the API for this class
     * @param {boolean} [opt.embedded=false] this class owns no records and is used as part of other class records only
     * @param {string} [opt.targetModel] the model edges incoming vertices are restricted to
     * @param {string} [opt.source] the model edges outgoing vertices are restricted to
     * @param {Array.<string>} [opt.uniqueNonIndexedProps] the properties which in combination are expected to be unique (used in building select queries)
     */
    constructor(opt: ModelTypeInput) {
        this.name = opt.name;
        this.description = opt.description || '';
        this._inherits = opt.inherits || [];
        this.subclasses = opt.subclasses || [];
        this.isEdge = Boolean(opt.isEdge);
        this.targetModel = opt.targetModel;
        this.sourceModel = opt.sourceModel;

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
            ...opt.permissions,
        };

        this.indices = opt.indices || [];

        this._properties = {}; // by name

        for (const prop of opt.properties || []) {
            this._properties[prop.name] = new Property({ ...omit(prop, ['linkedClass']) });
        }
    }

    /**
     * the default route name for this class
     * @type {string}
     */
    get routeName() {
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

    /**
     * the list of parent class names which this class inherits from
     * @type {Array.<string>}
     */
    get inherits() {
        const parents: string[] = [];

        for (const model of this._inherits) {
            parents.push(model.name);
            parents.push(...model.inherits);
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
    subClassModel(modelName) {
        for (const subclass of this.subclasses) {
            if (subclass.name === modelName) {
                return subclass;
            }

            try {
                return subclass.subClassModel(modelName);
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
     * @param {boolean} excludeAbstract exclude abstract models
     *
     * @returns {Array.<ClassModel>} the array of descendant models
     */
    descendantTree(excludeAbstract = false) {
        const descendants: ClassModel[] = [this];
        const queue = this.subclasses.slice();

        while (queue.length > 0) {
            const child = queue.shift() as ClassModel;

            if (descendants.includes(child)) {
                continue;
            }
            descendants.push(child);
            queue.push(...child.subclasses);
        }
        return descendants.filter((model) => !excludeAbstract || !model.isAbstract);
    }

    /**
     * Returns a set of properties from this class and all subclasses
     * @type {Array.<Property>}
     */
    get queryProperties() {
        const queue = Array.from(this.subclasses);
        const queryProps = this.properties;

        while (queue.length > 0) {
            const curr = queue.shift() as ClassModel;

            for (const prop of Object.values(curr.properties)) {
                if (queryProps[prop.name] === undefined) { // first model to declare is used
                    queryProps[prop.name] = prop;
                }
            }
            queue.push(...curr.subclasses);
        }
        return queryProps;
    }

    /**
     * a list of property names for all required properties
     * @type {Array.<string>}
     */
    get required() {
        const required = Array.from(Object.values(this._properties).filter(
            (prop) => prop.mandatory,
        ), (prop) => prop.name);

        for (const parent of this._inherits) {
            required.push(...parent.required);
        }
        return required;
    }

    /**
     * a list of property names for all optional properties
     * @type {Array.<string>}
     */
    get optional() {
        const optional = Array.from(
            Object.values(this._properties).filter((prop) => !prop.mandatory),
            (prop) => prop.name,
        );

        for (const parent of this._inherits) {
            optional.push(...parent.optional);
        }
        return optional;
    }

    /**
     * Check if this model inherits a property from a parent model
     */
    inheritsProperty(propName) {
        for (const model of this._inherits) {
            if (model._properties[propName] !== undefined) {
                return true;
            }
            if (model.inheritsProperty(propName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * a list of the properties associate with this class or parents of this class
     * @type {Array.<Property>}
     */
    get properties() {
        let properties = { ...this._properties };

        for (const parent of this._inherits) {
            properties = { ...parent.properties, ...properties }; // properties of the same name are taken from the lowest model
        }
        return properties;
    }

    /**
     * @returns {Object} a partial json representation of the current class model
     */
    toJSON() {
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
            properties: this.properties,
            inherits: this.inherits,
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
    formatRecord(record: GraphRecord, opt = {}): GraphRecord {
        // add default options
        const {
            dropExtra = true,
            addDefaults = true,
            ignoreExtra = false,
            ignoreMissing = false,
        }: {
            dropExtra?: boolean;
            addDefaults?: boolean;
            ignoreExtra?: boolean;
            ignoreMissing?: boolean;
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
                formattedRecord[prop.name] = prop.validate(formattedRecord[prop.name]);
            }
        }

        // look for linked models
        for (let [attr, value] of Object.entries(formattedRecord)) {
            let { linkedClass, type, iterable } = properties[attr];

            if (type.startsWith('embedded') && linkedClass !== undefined && value) {
                if (value['@class'] && value['@class'] !== linkedClass.name) {
                    linkedClass = linkedClass.subClassModel(value['@class']);
                }
                if (type === 'embedded' && typeof value === 'object') {
                    value = linkedClass.formatRecord(value);
                } else if (iterable) {
                    value = Array.from(value, (v) => (linkedClass as ClassModel).formatRecord(v as GraphRecord));
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
