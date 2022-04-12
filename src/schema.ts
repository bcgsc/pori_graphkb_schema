import {
    PropertyDefinition, ClassDefinition, GraphRecord, ClassMapping,
} from './types';
import { ValidationError } from './error';
import { validateProperty } from './property';
import * as sentenceTemplates from './sentenceTemplates';

class SchemaDefinition {
    readonly models: Record<string, ClassDefinition>;
    readonly normalizedModelNames: Record<string, ClassDefinition>;
    readonly subclassMapping: Record<string, string[]>;

    constructor(models: Record<string, ClassDefinition>) {
        this.models = models;
        this.normalizedModelNames = {};
        const subclassMapping: Record<string, string[]> = {};

        Object.keys(this.models).forEach((name) => {
            const model = this.models[name];
            this.normalizedModelNames[name.toLowerCase()] = model;

            if (model.reverseName) {
                this.normalizedModelNames[model.reverseName.toLowerCase()] = model;
            }
            model.inherits.forEach((parent) => {
                if (subclassMapping[parent] === undefined) {
                    subclassMapping[parent] = [];
                }
                subclassMapping[parent].push(name);
            });
        });
        this.subclassMapping = subclassMapping;
    }

    /**
     * Check that a given class/model name exists
     */
    has(obj: unknown): boolean {
        return Boolean(this.get(obj, false));
    }

    /**
     * Returns Knowledge base class schema.
     * @param {Object|string} obj - Record to fetch schema of.
     */
    get(obj: unknown, strict?: true): ClassDefinition;
    get(obj: unknown, strict?: false): ClassDefinition | null;
    get(obj: unknown, strict = true): ClassDefinition | null {
        let className = obj;

        if (obj && typeof obj === 'object' && obj['@class']) {
            className = obj['@class'];
        }
        let model: ClassDefinition | null = null;

        if (typeof className === 'string') {
            className = className.toLowerCase();
            model = this.normalizedModelNames[className as string] || null;
        }
        if (!model && strict) {
            throw new ValidationError(`Unable to retrieve model: ${className || obj}`);
        }
        return model;
    }

    getFromRoute(routeName: string): ClassDefinition {
        for (const model of Object.values(this.models)) {  // eslint-disable-line
            if (model.routeName === routeName) {
                return model;
            }
        }
        throw new Error(`Missing model corresponding to route (${routeName})`);
    }

    getModels(): ClassDefinition[] {
        return Object.values(this.models);
    }

    getEdgeModels(): ClassDefinition[] {
        return Object.values(this.models).filter((model) => model.isEdge);
    }

    /**
    * Returns preview of given record based on its '@class' value
    * @param {Object} obj - Record to be parsed.
    */
    getPreview(obj: GraphRecord): string {
        if (obj && typeof obj === 'object') {
            if (obj['@class'] === 'Statement') {
                const { content } = sentenceTemplates.generateStatementSentence(
                    this.getPreview.bind(this),
                    obj,
                );
                return content;
            }

            if (obj.displayName) {
                return obj.displayName;
            }
            if (obj.name) {
                return obj.name;
            }
            if (obj['@rid']) {
                return obj['@rid'];
            }
            if (Array.isArray(obj)) { // embedded link set
                return `${obj.length}`;
            }
            if (obj.target && typeof obj.target === 'object') {
                // preview pseudo-edge objects
                return this.getPreview(obj.target as Record<string, unknown>);
            }
        }
        return `${obj}`;
    }

    /**
     * Returns the order in which classes should be initialized so that classes which depend on
     * other classes already exist. i.e the first item in the array will be classes that do not have
     * any dependencies, followed by classes that only depend on those in the first item. For example if class
     * Ontology inherits from class V then class V would be in an array preceding the array
     * containing Ontology.
     *
     * Note: V, E, User, and UserGroup are special cases and always put in the first level since
     * they have circular dependencies and are created in a non-standard manner
     */
    splitClassLevels(): Array<string>[] {
        const adjacencyList: ClassMapping<string[]> = {};

        // initialize adjacency list
        for (const model of Object.values(this.models)) {
            adjacencyList[model.name] = [];
        }

        for (const model of Object.values(this.models)) {
            for (const prop of Object.values(this.getProperties(model.name))) {
                if (prop.linkedClass) {
                    adjacencyList[model.name].push(prop.linkedClass);
                }
            }

            for (const parent of this.ancestors(model.name)) {
                adjacencyList[model.name].push(parent);
            }

            if (model.targetModel) {
                adjacencyList[model.name].push(model.targetModel);
            }

            if (model.sourceModel) {
                adjacencyList[model.name].push(model.sourceModel);
            }
        }

        const updateAdjList = (adjList, currentLevel, removedModels) => {
            currentLevel.forEach((model) => {
                removedModels.add(model);
                delete adjacencyList[model];
            });

            for (const model of Object.keys(adjList)) {
                adjList[model] = adjList[model].filter((d) => !removedModels.has(d));
            }
        };

        const removed = new Set(); // special cases always in the top level
        const levels: string[][] = [['V', 'E', 'User', 'UserGroup']];

        updateAdjList(adjacencyList, levels[0], removed);

        while (Object.values(adjacencyList).length > 0) {
            const level: string[] = [];

            for (const [model, dependencies] of Object.entries(adjacencyList)) {
                if (dependencies.length === 0) {
                    level.push(model);
                }
            }
            levels.push(level);

            updateAdjList(adjacencyList, level, removed);
        }

        return levels;
    }

    /**
     * a list of the properties associate with this class or parents of this class
     */
    getProperties(modelName: string): Record<string, PropertyDefinition> {
        const model = this.get(modelName);
        let properties: Record<string, PropertyDefinition> = { ...model.properties };

        for (const parent of this.ancestors(modelName)) {
            properties = { ...this.getProperties(parent), ...properties }; // properties of the same name are taken from the lowest model
        }
        return properties;
    }

    requiredProperties(modelName: string): string[] {
        return Object.values(this.getProperties(modelName))
            .filter((propDefn) => propDefn.mandatory)
            .map((propDefn) => propDefn.name);
    }

    optionalProperties(modelName: string): string[] {
        return Object.values(this.getProperties(modelName))
            .filter((propDefn) => !propDefn.mandatory)
            .map((propDefn) => propDefn.name);
    }

    getProperty(modelName: string, property: string): PropertyDefinition {
        return this.getProperties(modelName)[property];
    }

    hasProperty(modelName: string, property: string): boolean {
        return Boolean(this.getProperty(modelName, property));
    }

    inheritsFrom(modelName: string, parent: string): boolean {
        return this.ancestors(modelName).includes(parent);
    }

    /**
     * Returns the list of properties for the Class.active index. This is
     * expected to represent a unique constraint on a combination of these properties
     *
     * @returns list of properties which belong to the index
     */
    activeProperties(modelName: string): string[] | null {
        const model = this.get(modelName);

        for (const index of model.indices) {
            if (index.name === `${model.name}.active`) {
                return index.properties;
            }
        }
        return null;
    }

    /**
     * the list of parent class names which this class inherits from
     */
    ancestors(modelName: string): string[] {
        const model = this.get(modelName);
        const parents: string[] = [];

        for (const parent of model.inherits) {
            parents.push(parent);
            parents.push(...this.ancestors(parent));
        }
        return parents;
    }

    children(modelName: string): string[] {
        const model = this.get(modelName);
        return this.subclassMapping[model.name] || [];
    }

    /**
     * Get a list of models (including the current model) for all descendants of the current model
     *
     * @param excludeAbstract exclude abstract models
     *
     * @returns the array of descendant models
     */
    descendants(
        modelName: string,
        opt: { excludeAbstract?: boolean; includeSelf?: boolean } = {},
    ): string[] {
        const { excludeAbstract = false, includeSelf = false } = opt;
        const descendants: string[] = includeSelf
            ? [modelName]
            : [];
        const queue: string[] = this.children(modelName).slice();

        while (queue.length > 0) {
            const child = queue.shift() as typeof queue[number];

            if (descendants.includes(child)) {
                continue;
            }
            descendants.push(child);
            queue.push(...this.children(child));
        }
        return descendants.filter((child) => {
            const descendantModel = this.get(child, true);
            return (!excludeAbstract || !descendantModel.isAbstract);
        });
    }

    /**
     * Returns a set of properties from this class and all subclasses
     */
    queryableProperties(modelName: string) {
        const model = this.get(modelName);
        const queue = Array.from(this.children(modelName));
        const queryProps = this.getProperties(model.name);

        while (queue.length > 0) {
            const curr = queue.shift() as typeof queue[number];
            const currModel = this.get(curr);

            for (const prop of Object.values(this.getProperties(currModel.name))) {
                if (queryProps[prop.name] === undefined) { // first model to declare is used
                    queryProps[prop.name] = prop;
                }
            }
            queue.push(...this.children(curr));
        }
        return queryProps;
    }

    /**
     * Check if this model inherits a property from a parent model
     */
    inheritsProperty(modelName: string, propName: string) {
        const model = this.get(modelName);

        for (const parent of model.inherits) {
            const parentModel = this.get(parent);

            if (parentModel.properties[propName] !== undefined) {
                return true;
            }
            if (this.inheritsProperty(parent, propName)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Checks a single record to ensure it matches the expected pattern for this class model, returns a copy of the record with validated/cast properties
     *
     * @param {Object} record the record to be checked
     * @param {Object} opt options
     * @param {boolean} [opt.dropExtra=true] drop any record attributes that are not defined on the current class model by either required or optional
     * @param {boolean} [opt.addDefaults=false] add default values for any attributes not given (where defined)
     * @param {boolean} [opt.ignoreMissing=false] do not throw an error when a required attribute is missing
     * @param {boolean} [opt.ignoreExtra=false] do not throw an error when an unexpected value is given
     */
    formatRecord(
        modelName: unknown,
        record: GraphRecord,
        opt: {
            dropExtra?: boolean;
            addDefaults?: boolean;
            ignoreExtra?: boolean;
            ignoreMissing?: boolean;
        } = {},
    ): GraphRecord {
        const model = this.get(modelName);
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
        const properties = this.getProperties(model.name);

        if (!ignoreExtra && !dropExtra) {
            for (const attr of Object.keys(record)) {
                if (model.isEdge && (attr === 'out' || attr === 'in')) {
                    continue;
                }
                if (properties[attr] === undefined) {
                    throw new ValidationError(`[${model.name}] unexpected attribute: ${attr}`);
                }
            }
        }
        // if this is an edge class, check the to and from attributes
        if (model.isEdge) {
            if (record.out) {
                formattedRecord.out = record.out;
            } else if (!ignoreMissing) {
                throw new ValidationError(`[${model.name}] missing required attribute out`);
            }
            if (record.in) {
                formattedRecord.in = record.in;
            } else if (!ignoreMissing) {
                throw new ValidationError(`[${model.name}] missing required attribute in`);
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
                    throw new ValidationError(`[${model.name}] missing required attribute ${prop.name}`);
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

            if (type.startsWith('embedded') && linkedClass !== undefined && value) {
                if (value['@class'] && value['@class'] !== linkedClass) {
                    // record has a class type that doesn't match the expected linkedClass, is it a subclass of it?
                    if (this.ancestors(value['@class']).includes(linkedClass)) {
                        linkedClass = value['@class'];
                    } else {
                        throw new ValidationError(`A linked class was defined (${linkedClass}) but the record is not of that class or its descendants: ${value['@class']}`);
                    }
                }
                if (type === 'embedded' && typeof value === 'object') {
                    value = this.formatRecord(linkedClass, value);
                } else if (iterable) {
                    value = Array.from(
                        value,
                        (v) => this.formatRecord(linkedClass, v as GraphRecord),
                    );
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

export {
    SchemaDefinition,
};
