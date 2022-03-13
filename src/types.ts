type IndexTypes = 'unique' | 'NOTUNIQUE';

export interface Index {
    name: string;
    type: IndexTypes;
    metadata?: { ignoreNullValues: boolean };
    properties: string[];
    class: string;
}

export interface Expose {
    QUERY?: boolean;
    PATCH?: boolean;
    DELETE?: boolean;
    POST?: boolean;
    GET?: boolean;
}

export type DbType = 'string' | 'long' | 'link' | 'linkset' | 'integer' | 'embeddedlist' | 'embeddedset' | 'boolean' | 'embedded';

/**
 * create a new property
 *
 * @param {Object} opt options
 * @param {string} opt.name the property name
 * @param {*|Function} opt.default the default value or function for generating the default
 * @param {boolean} opt.generated indicates that this is a generated field and should not be input by the user
 * @param {boolean} opt.generationDependencies indicates that a field should be generated after all other processing is complete b/c it requires other fields
 * @param {*} opt.example an example value to use for help text
 * @param {string} opt.pattern the regex pattern values for this property should follow (used purely in docs)
 * @param {boolean} opt.nullable flag to indicate if the value can be null
 * @param {boolean} opt.mandatory flag to indicate if this property is required
 * @param {boolean} opt.nonEmpty for string properties indicates that an empty string is invalid
 * @param {string} opt.description description for the openapi spec
 * @param {ClassModel} opt.linkedClass if applicable, the class this link should point to or embed
 * @param {Array} opt.enum enum representing acceptable values
 * @param {Number} opt.min minimum value allowed (for intger type properties)
 * @param {Number} opt.max maximum value allowed (for integer type properties)
 * @param {Function} opt.cast the function to be used in formatting values for this property (for list properties it is the function for elements in the list)
 * @param {boolean} opt.indexed if this field is exact indexed for quick search
 * @param {boolean} opt.fulltextIndexed if this field has a fulltext index
 *
 * @return {Property} the new property
 */
export interface Property {
    name: string;
    cast?: (arg0: unknown) => unknown;
    description: string;
    examples?: unknown[];
    enum?: unknown[];
    generated?: boolean;
    generationDependencies?: boolean;
    generateDefault?: () => unknown;
    default?: unknown;
    iterable: boolean;
    linkedClass?: string;
    mandatory: boolean; // default false
    max?: number;
    maxItems?: number;
    min?: number;
    minItems?: number;
    minLength?: number;
    nullable: boolean;
    pattern?: RegExp;
    type: DbType;
    check?: (arg0: unknown) => boolean;
}

export interface FormatRecordOptions {
    dropExtra?: boolean;
    addDefaults?: boolean;
    ignoreExtra?: boolean;
    ignoreMissing?: boolean;
}

export interface ClassModelType {
    readonly description: string;
    readonly embedded: boolean;
    readonly routes: Expose;
    readonly _inherits: string[];
    readonly isAbstract: boolean;
    readonly _properties: Record<string, Property>;
    readonly name: string;
    readonly isEdge: boolean;
    readonly reverseName: string;
    readonly sourceModel: string | null;
    readonly targetModel: string | null;
    readonly permissions: Expose;
    readonly indices: Index[];
    readonly uniqueNonIndexedProps: string[];

    get routeName(): string;
    required(schema: Schema): string[];
    optional(schema: Schema): string[];
    ancestors(schema: Schema): ClassModelType[];
    subclasses(schema: Schema): ClassModelType[];
    queryProperties(schema: Schema): Record<string, Property>;
    properties(schema: Schema): Record<string, Property>;
    getActiveProperties(): string[] | null;
    subClassModel(schema: Schema, modelName: string): ClassModelType;
    descendantTree(schema: Schema, excludeAbstract: boolean): ClassModelType[];
    inheritsProperty(schema: Schema, propName: string): boolean;
    toJSON(schema: Schema): {
        properties: Record<string, Property>;
        inherits: string[];
        isEdge: boolean;
        name: string;
        isAbstract: boolean;
        embedded: boolean;
        reverseName?: string;
        route?: string;
    };
    formatRecord(schema: Schema, record, opt: FormatRecordOptions): any
}

export interface EdgeModelType extends ClassModelType {
    readonly sourceModel: string;
    readonly targetModel: string;
    readonly isEdge: true;
}

export type Schema = Record<string, ClassModelType>;
