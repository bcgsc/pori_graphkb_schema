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

export type EdgeName = (
    'E'
    | 'AliasOf'
    | 'Cites'
    | 'CrossReferenceOf'
    | 'DeprecatedBy'
    | 'ElementOf'
    | 'GeneralizationOf'
    | 'Infers'
    | 'SubClassOf'
    | 'TargetOf'
);

export type VertexName = (
    'V'
    | 'Abstract'
    | 'AnatomicalEntity'
    | 'Biomarker'
    | 'CatalogueVariant'
    | 'CategoryVariant'
    | 'ClinicalTrial'
    | 'CuratedContent'
    | 'Disease'
    | 'Evidence'
    | 'EvidenceLevel'
    | 'Feature'
    | 'LicenseAgreement'
    | 'Ontology'
    | 'Pathway'
    | 'PositionalVariant'
    | 'Publication'
    | 'Signature'
    | 'Source'
    | 'Statement'
    | 'Therapy'
    | 'User'
    | 'UserGroup'
    | 'Variant'
    | 'Vocabulary'
);

export type EmbeddedVertexName = (
    'Position'
    | 'CdsPosition'
    | 'CytobandPosition'
    | 'ExonicPosition'
    | 'GenomicPosition'
    | 'IntronicPosition'
    | 'NonCdsPosition'
    | 'Permissions'
    | 'ProteinPosition'
    | 'RnaPosition'
    | 'StatementReview'
);

export type ClassName = VertexName | EdgeName | EmbeddedVertexName;

export type GroupName = 'readonly' | 'regular' | 'manager' | 'admin';

export type ClassPermissions = Partial<Record<GroupName, number> > & { default?: number };

export type UserGroupPermissions = Record<GroupName, Partial<Record<string, number>>>;

export interface PropertyDefinition {
    readonly name: string;
    readonly cast?: (value: any) => unknown; // the function to be used in formatting values for this property (for list properties it is the function for elements in the list)
    readonly type: DbType; // the database type of this property
    readonly pattern?: string; // a regex pattern that values for this property can be restricted by
    readonly description?: string; // description for the openapi spec
    readonly generated?: boolean; // indicates if this property is a generated value and not expected to be input from a user
    readonly mandatory?: boolean; // indicates if this is a required property
    readonly nullable?: boolean; // flag to indicate if the value can be null
    readonly readOnly?: boolean;
    readonly generateDefault?: (rec?: unknown) => unknown;
    readonly check?: (rec?: unknown) => boolean;
    readonly default?: unknown;
    readonly examples?: unknown[]; // example values to use for help text
    readonly generationDependencies?: boolean; // indicates that a field should be generated after all other processing is complete b/c it requires other fields
    readonly nonEmpty?: boolean; // for string properties indicates that an empty string is invalid
    readonly linkedType?: string;
    readonly format?: 'date';
    readonly choices?: unknown[]; // enum representing acceptable values
    readonly min?: number; // minimum value allowed (for integer type properties)
    readonly minItems?: number;
    readonly max?: number; // maximum value allowed (for integer type properties)
    readonly maxItems?: number;
    readonly iterable: boolean;
    readonly indexed: boolean; // indicates if this field is exact indexed for quick search
    readonly fulltextIndexed: boolean; // indicates if this field has a fulltext index
    readonly linkedClass?: string; // if applicable, the class this link should point to or embed
}

export interface ClassDefinition {
    readonly routeName: string; // the name used for the REST route of this class in the API
    readonly inherits: string[]; // classes which this inherits all properties and indices from
    readonly properties: Record<string, PropertyDefinition>; // mapping of property name to definition
    readonly description: string;
    readonly embedded: boolean; // indicates if this is an embedded class (cannot be searched/created directly)
    readonly indices: IndexType[];
    readonly isAbstract: boolean; // indicates if this is an abstract (in the database) class
    readonly isEdge: boolean; // indicates if this is an edge type class which should inherit from the base edge class E
    readonly name: string; // name of this class
    readonly permissions: ClassPermissions;
    readonly reverseName?: string;
    readonly routes: any; // the routes to expose on the API for this class
    readonly sourceModel?: VertexName;// the model edges outgoing vertices are restricted to
    readonly targetModel?: VertexName;// the model edges incoming vertices are restricted to
}

export interface GraphRecord {
    [key: string]: any;
}

export interface PropertyDefinitionInput extends Partial<Omit<PropertyDefinition, 'default' | 'generated' | 'generateDefault' | 'name'>> {
    generated?: unknown;
    default?: unknown;
    name: PropertyDefinition['name'];
}

export interface ClassDefinitionInput extends Partial<Omit<ClassDefinition, 'properties' | 'name'>> {
    properties?: PropertyDefinitionInput[];
    name: ClassDefinition['name'];
}

export type ClassMapping<T> = Partial<Record<ClassName, T>>;

export type PartialSchemaDefn = ClassMapping<Omit<ClassDefinitionInput, 'name'>>;
