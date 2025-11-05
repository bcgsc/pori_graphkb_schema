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
    evidenceLevel?: PartialOntologyRecord[];
    subject: OntologyRecord;
    relevance: PartialOntologyRecord;
}

export interface PropertyDefinition {
    /** the function to be used in formatting values for this property (for list properties it is the function for elements in the list) */
    cast?: (value: any) => unknown;
    check?: (rec?: unknown) => boolean;
    /** enum representing acceptable values */
    choices?: unknown[];
    default?: unknown;
    /** description for the openapi spec */
    description?: string;
    /** example values to use for help text */
    examples?: unknown[];
    format?: 'date';
    /** indicates if this field has a fulltext index */
    fulltextIndexed: boolean;
    /** indicates if this property is a generated value and not expected to be input from a user */
    generated?: boolean;
    generateDefault?: (rec?: any) => unknown;
    /** indicates that a field should be generated after all other processing is complete b/c it requires other fields */
    generationDependencies?: boolean;
    /** indicates if this field is exact indexed for quick search */
    indexed: boolean;
    iterable: boolean;
    /** if applicable, the class this link should point to or embed */
    linkedClass?: string;
    linkedType?: string;
    /** indicates if this is a required property */
    mandatory?: boolean;
    /** maximum value allowed (for integer type properties) */
    maximum?: number;
    maxItems?: number;
    /** minimum value allowed (for integer type properties) */
    minimum?: number;
    minItems?: number;
    name: string;
    /** for string properties indicates that an empty string is invalid */
    nonEmpty?: boolean;
    /** flag to indicate if the value can be null */
    nullable?: boolean;
    /** a regex pattern that values for this property can be restricted by */
    pattern?: string;
    readOnly?: boolean;
    /** the database type of this property */
    type: DbType;
}

export interface ClassDefinition {
    description: string;
    /** indicates if this is an embedded class (cannot be searched/created directly) */
    embedded: boolean;
    indices: IndexType[];
    /** classes which this inherits all properties and indices from */
    inherits: string[];
    /** indicates if this is an abstract (in the database) class */
    isAbstract: boolean;
    /** indicates if this is an edge type class which should inherit from the base edge class E */
    isEdge: boolean;
    /** name of this class */
    name: string;
    permissions: ClassPermissions;
    /** mapping of property name to definition */
    properties: Readonly<Record<string, Readonly<PropertyDefinition>>>;
    reverseName?: string;
    /** the name used for the REST route of this class in the API */
    routeName: string;
    /** the routes to expose on the API for this class */
    routes: Expose
    /** the model edges outgoing vertices are restricted to */
    sourceModel?: VertexName;
    /** the model edges incoming vertices are restricted to */
    targetModel?: VertexName;
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
