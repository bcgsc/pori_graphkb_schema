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
    readonly cast?: (value: any) => unknown;
    readonly type: DbType;
    readonly pattern?: string;
    readonly description?: string;
    readonly generated?: boolean;
    readonly mandatory?: boolean;
    readonly nullable?: boolean;
    readonly readOnly?: boolean;
    readonly generateDefault?: (rec?: unknown) => unknown;
    readonly check?: (rec?: unknown) => boolean;
    readonly default?: unknown;
    readonly examples?: unknown[];
    readonly generationDependencies?: boolean;
    readonly nonEmpty?: boolean;
    readonly linkedType?: 'string';
    readonly format?: 'date';
    readonly choices?: unknown[];
    readonly min?: number;
    readonly minItems?: number;
    readonly max?: number;
    readonly maxItems?: number;
    readonly iterable: boolean;
    readonly indexed: boolean;
    readonly fulltextIndexed: boolean;
    readonly linkedClass?: string;
}

export interface ClassDefinition {
    readonly routeName: string;
    readonly inherits: string[];
    readonly properties: Record<string, PropertyDefinition>;
    readonly description: string;
    readonly embedded: boolean;
    readonly indices: IndexType[];
    readonly isAbstract: boolean;
    readonly isEdge: boolean;
    readonly name: string;
    readonly permissions: ClassPermissions;
    readonly reverseName?: string;
    readonly routes: any;
    readonly sourceModel?: VertexName;
    readonly targetModel?: VertexName;
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
