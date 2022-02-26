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
    type: 'NOTUNIQUE' | 'unique' | 'NOTUNIQUE_HASH_INDEX' | 'FULLTEXT';
    metadata?: { ignoreNullValues: boolean };
    properties: string[];
    class: string;
}

export interface PropertyType<Name extends string, PType = unknown> {
    name: Name;
    type?: 'string' | 'long' | 'link' | 'linkset' | 'integer' | 'embeddedlist' | 'embeddedset' | 'boolean' | 'embedded';
    pattern?: string;
    description?: string;
    generated?: boolean;
    cast?: (str: string) => PType;
    mandatory?: boolean;
    nullable?: boolean;
    readOnly?: boolean;
    default?: ((rec?: unknown) => PType) | PType;
    example?: PType;
    linkedClass?: string;
    generationDependencies?: boolean;
    nonEmpty?: boolean;
    linkedType?: 'string';
    format?: 'date';
    choices?: string[];
    min?: number;
    minItems?: number;
}

export interface ModelType {
    description?: string;
    routes?: Expose;
    isAbstract?: boolean;
    isEdge?: boolean;
    properties?: PropertyType<string>[];
    indices?: IndexType[];
    reverseName?: string;
    inherits?: string[];
    sourceModel?: string;
    targetModel?: string;
    permissions?: Record<string, number>;
    embedded?: boolean;

    // added during initialization
    name?: string;
}
