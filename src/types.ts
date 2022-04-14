import { GraphRecordId } from './constants';

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

export interface GraphRecord {
    [key: string]: unknown;
    sourceId?: string;
    name?: string;
    source?: string | GraphRecord;
    displayName?: string;
    '@rid': GraphRecordId;
    '@class'?: string;
}

interface OntologyRecord extends GraphRecord {
    displayName: string;
    '@class': string;
}

interface PartialOntologyRecord extends GraphRecord {
    displayName: string;
}

export interface StatementRecord extends Partial<GraphRecord> {
    conditions: OntologyRecord[];
    evidence?: PartialOntologyRecord[];
    subject: OntologyRecord;
    relevance: PartialOntologyRecord;
}

export interface PropertyDefinition {
    /** the function to be used in formatting values for this property (for list properties it is the function for elements in the list) */
    readonly cast?: (value: any) => unknown
    readonly check?: (rec?: unknown) => boolean;
    /** enum representing acceptable values */
    readonly choices?: unknown[]
    readonly default?: unknown;
    /** description for the openapi spec */
    readonly description?: string
    /** example values to use for help text */
    readonly examples?: unknown[]
    readonly format?: 'date';
    /** indicates if this field has a fulltext index */
    readonly fulltextIndexed: boolean
    /** indicates if this property is a generated value and not expected to be input from a user */
    readonly generated?: boolean
    readonly generateDefault?: (rec?: any) => unknown;
    /** indicates that a field should be generated after all other processing is complete b/c it requires other fields */
    readonly generationDependencies?: boolean
    /** indicates if this field is exact indexed for quick search */
    readonly indexed: boolean
    readonly iterable: boolean;
    /** if applicable, the class this link should point to or embed */
    readonly linkedClass?: string
    readonly linkedType?: string;
    /** indicates if this is a required property */
    readonly mandatory?: boolean
    /** maximum value allowed (for integer type properties) */
    readonly max?: number
    readonly maxItems?: number;
    /** minimum value allowed (for integer type properties) */
    readonly min?: number
    readonly minItems?: number;
    readonly name: string;
    /** for string properties indicates that an empty string is invalid */
    readonly nonEmpty?: boolean
    /** flag to indicate if the value can be null */
    readonly nullable?: boolean
    /** a regex pattern that values for this property can be restricted by */
    readonly pattern?: string
    readonly readOnly?: boolean;
    /** the database type of this property */
    readonly type: DbType
}

export interface ClassDefinition {
    readonly description: string;
    /** indicates if this is an embedded class (cannot be searched/created directly) */
    readonly embedded: boolean
    readonly indices: IndexType[];
    /** classes which this inherits all properties and indices from */
    readonly inherits: string[]
    /** indicates if this is an abstract (in the database) class */
    readonly isAbstract: boolean
    /** indicates if this is an edge type class which should inherit from the base edge class E */
    readonly isEdge: boolean
    /** name of this class */
    readonly name: string
    readonly permissions: ClassPermissions;
    /** mapping of property name to definition */
    readonly properties: Record<string, PropertyDefinition>
    readonly reverseName?: string;
    /** the name used for the REST route of this class in the API */
    readonly routeName: string
    /** the routes to expose on the API for this class */
    readonly routes: any
    readonly sourceModel?: VertexName;// the model edges outgoing vertices are restricted to
    readonly targetModel?: VertexName;// the model edges incoming vertices are restricted to
}

export interface PropertyDefinitionInput extends Partial<Omit<PropertyDefinition, 'generated' | 'name'>> {
    generated?: unknown;
    name: PropertyDefinition['name'];
}

export interface ClassDefinitionInput extends Partial<Omit<ClassDefinition, 'properties' | 'name'>> {
    properties?: PropertyDefinitionInput[];
    name: ClassDefinition['name'];
}

export type ClassMapping<T> = Partial<Record<ClassName, T>>;

export type PartialSchemaDefn = ClassMapping<Omit<ClassDefinitionInput, 'name'>>;
