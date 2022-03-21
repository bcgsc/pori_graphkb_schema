export interface Expose {
    /** create the GET route */
    QUERY: boolean;
    /** create the GET/{rid} route */
    GET: boolean;
    /** create the POST route */
    POST: boolean;
    /** create the PATCH/{rid} route */
    PATCH: boolean;
    /** create the DELETE/{rid} route */
    DELETE: boolean;
}

export interface IndexType {
    name: string;
    type: 'NOTUNIQUE' | 'UNIQUE' | 'NOTUNIQUE_HASH_INDEX' | 'FULLTEXT' | 'FULLTEXT_HASH_INDEX';
    metadata?: { ignoreNullValues: boolean };
    properties: string[];
    class: string;
}

export type DbType = 'string' | 'long' | 'link' | 'linkset' | 'integer' | 'embeddedlist' | 'embeddedset' | 'boolean' | 'embedded';

export interface PropertyTypeDefinition<PType = any> {
    cast?: (value: any) => PType;
    check?: (value: any) => boolean;
    choices?: unknown[];
    default?: ((rec?: any) => PType) | PType;
    description?: string;
    example?: PType;
    format?: 'date';
    fulltextIndexed?: boolean;
    generated?: boolean;
    generationDependencies?: boolean;
    indexed?: boolean;
    linkedClass?: string;
    linkedType?: 'string';
    mandatory?: boolean;
    max?: number;
    maxItems?: number;
    min?: number;
    minItems?: number;
    name: string;
    nonEmpty?: boolean;
    nullable?: boolean;
    pattern?: string;
    readOnly?: boolean;
    type?: DbType;
}

export interface ModelTypeDefinition {
    description?: string;
    embedded?: boolean;
    indices?: IndexType[];
    inherits?: string[];
    isAbstract?: boolean;
    isEdge?: boolean;
    permissions?: Record<string, number>;
    properties?: PropertyTypeDefinition[];
    reverseName?: string;
    routes?: Expose;
    sourceModel?: string;
    targetModel?: string;

    // added during initialization
    name?: string;
}

export interface ModelType {
    _inherits: ModelType[];
    _properties: Record<string, PropertyType>;
    description: string;
    embedded: boolean;
    indices: IndexType[];
    isAbstract: boolean;
    isEdge: boolean;
    name: string;
    permissions: any;
    reverseName: string;
    routes: any;
    sourceModel?: string;
    subclasses: ModelType[];
    targetModel?: string;

    get inherits(): string[];
    get optional(): string[];
    get properties(): Record<string, PropertyType>;
    get queryProperties(): Record<string, PropertyType>;
    get required(): string[];
    get routeName(): string;

    descendantTree(excludeAbstract: boolean): ModelType[];
    formatRecord(record: Record<string, GraphRecord>, opt?);
    getActiveProperties(): string[] | null;
    inheritsProperty(propName: string): boolean;
    inheritsProperty(propName: string): boolean;
    subClassModel(modelName: string): ModelType;
    toJSON(): {
        properties: Record<string, PropertyType>;
        inherits: string[];
        isEdge: boolean;
        name: string;
        isAbstract: boolean;
        embedded: boolean;
        reverseName?: string;
        route?: string;
    };
}

export interface PropertyType {
    cast?: (value: any) => any;
    check?: (rec?: unknown) => boolean;
    choices?: unknown[];
    default?: unknown;
    description?: string;
    example?: unknown;
    format?: 'date';
    fulltextIndexed: boolean;
    generated?: boolean;
    generateDefault?: (rec?: any) => any;
    generationDependencies?: boolean;
    indexed: boolean;
    iterable: boolean;
    linkedClass?: ModelType;
    linkedType?: DbType;
    mandatory?: boolean;
    max?: number;
    maxItems?: number;
    min?: number;
    minItems?: number;
    name: string;
    nonEmpty?: boolean;
    nullable?: boolean;
    pattern?: string;
    readOnly?: boolean;
    type: DbType;
}

export interface GraphRecord {
    [key: string]: any;
}

export interface SchemaDefinitionType {
    schema: Record<string, ModelType>;
    normalizedModelNames: Record<string, ModelType>;

    has(obj: GraphRecord | string): boolean;
    get(obj: GraphRecord | string): ModelType | null;
    getFromRoute(routeName: string): ModelType;
    getModels(): ModelType[];
    getEdgeModels(): ModelType[];
    getPreview(GraphRecord): string;
}
