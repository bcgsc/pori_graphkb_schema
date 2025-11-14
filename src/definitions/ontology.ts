import * as util from '../util';
import { EXPOSE_READ, PERMISSIONS } from '../constants';
import { BASE_PROPERTIES } from './util';
import { PartialSchemaDefn } from '../types';

const models: PartialSchemaDefn = {
    Ontology: {
        routes: EXPOSE_READ,
        inherits: ['V', 'Biomarker'],
        indices: [
            {
                name: 'Ontology.active',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
                properties: ['source', 'sourceId', 'name', 'deletedAt', 'sourceIdVersion'],
                class: 'Ontology',
            },
            {
                name: 'Ontology.source',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['source'],
                class: 'Ontology',
            },
            {
                name: 'Ontology.name',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['name'],
                class: 'Ontology',
            },
            {
                name: 'Ontology.sourceId',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['sourceId'],
                class: 'Ontology',
            },
            {
                name: 'Ontology.name_fulltext',
                type: 'FULLTEXT',
                properties: ['name'],
                class: 'Ontology',
            },
            {
                name: 'Ontology.sourceId_fulltext',
                type: 'FULLTEXT',
                properties: ['sourceId'],
                class: 'Ontology',
            },
        ],
        properties: [
            {
                name: 'source',
                type: 'link',
                mandatory: true,
                nullable: false,
                linkedClass: 'Source',
                description: 'Link to the source (database, archive, institute, etc) from which this record is defined',
            },
            {
                name: 'sourceId',
                mandatory: true,
                nullable: false,
                nonEmpty: true,
                description: 'The identifier of the record/term in the external source database/system',
            },
            {
                name: 'dependency',
                type: 'link',
                description: 'Mainly for alias records. If this term is defined as a part of another term, this should link to the original term',
            },
            {
                name: 'name',
                nullable: false,
                generateDefault: (record) => record?.sourceId,
                description: 'Name of the term',
                nonEmpty: true,
                generationDependencies: true,
            },
            {
                name: 'sourceIdVersion',
                description: 'The version of the identifier based on the external database/system',
            },
            { name: 'description', type: 'string', cast: util.castNullableString },
            { name: 'longName', type: 'string', cast: util.castNullableString },
            {
                name: 'subsets',
                type: 'embeddedset',
                linkedType: 'string',
                description: 'A list of names of subsets this term belongs to',
                cast: (item) => `${item}`.trim().toLowerCase(),
            },
            {
                name: 'deprecated',
                type: 'boolean',
                default: false,
                nullable: false,
                mandatory: true,
                description: 'True when the term was deprecated by the external source',
            },
            {
                name: 'alias',
                type: 'boolean',
                default: false,
                nullable: false,
                mandatory: true,
                description: 'True when the term is defined as an alias or synonym of the sourceId attributed to it (does not have its own sourceId)',
            },
            { name: 'url', type: 'string' },
            {
                ...BASE_PROPERTIES.displayName,
                generateDefault: util.displayOntology,
            },
        ],
        isAbstract: true,
    },
    EvidenceLevel: {
        inherits: ['Evidence', 'Ontology'],
        description: 'Evidence Classification Term',
        properties: [
            {
                name: 'preclinical',
                type: 'boolean',
                nullable: true,
                mandatory: false,
                description: 'True when intended for studies on preclinical models, otherwise false or null',
            },
        ],
    },
    ClinicalTrial: {
        inherits: ['Evidence', 'Ontology'],
        properties: [
            { name: 'phase', type: 'string', examples: ['1B'] },
            { name: 'size', type: 'integer', description: 'The number of participants in the trial' },
            {
                name: 'startDate', type: 'string', format: 'date', pattern: '^\\d{4}(-\\d{2}(-\\d{2})?)?$',
            },
            {
                name: 'completionDate', type: 'string', format: 'date', pattern: '^\\d{4}(-\\d{2}(-\\d{2})?)?$',
            },
            { name: 'country', type: 'string', description: 'The country the trial is held in' },
            { name: 'city', type: 'string', description: 'The city the trial is held in' },
            {
                name: 'recruitmentStatus',
                type: 'string',
                description: 'The recruitment status of the trial',
                choices: [
                    'not yet recruiting',
                    'recruiting',
                    'enrolling by invitation',
                    'active, not recruiting',
                    'suspended',
                    'terminated',
                    'completed',
                    'withdrawn',
                    'unknown',
                ],
            },
            {
                name: 'location', type: 'string', description: 'Free text representation of the location of where the trial is being held', cast: util.castNullableString,
            },
        ],
        indices: [
            {
                name: 'ClinicalTrial.active',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
                properties: ['source', 'sourceId', 'sourceIdVersion', 'deletedAt'],
                class: 'ClinicalTrial',
            },
        ],
    },
    Abstract: {
        inherits: ['Publication'],
        description: 'Abstract from a publication or conference proceeding',
        properties: [
            {
                name: 'meeting', type: 'string', mandatory: true, nullable: false, examples: ['2011 ASCO Annual Meeting'],
            },
            {
                name: 'abstractNumber', type: 'string', mandatory: true, nullable: false, examples: ['10009'],
            },
        ],
        indices: [
            {
                name: 'Abstract.activeMeetingAbstractNumber',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
                properties: ['meeting', 'abstractNumber', 'deletedAt'],
                class: 'Abstract',
            },
        ],
    },
    Publication: {
        description: 'a book, journal, manuscript, or article',
        inherits: ['Evidence', 'Ontology'],
        properties: [
            {
                name: 'journalName',
                description: 'Name of the journal where the article was published',
                examples: ['Bioinformatics'],
            },
            {
                name: 'year', type: 'integer', examples: [2018], description: 'The year the article was published',
            },
            { name: 'doi', type: 'string', examples: ['doi:10.1037/rmh0000008'] },
            {
                name: 'content',
                description: 'content of the publication',
                type: 'string',
            },
            {
                name: 'authors', type: 'string', description: 'list of authors involved in the publication',
            },
            {
                name: 'citation', type: 'string', description: 'citation provided by the source entity', examples: ['J Clin Oncol 29: 2011 (suppl; abstr 10006)'],
            },
            { name: 'issue', examples: ['3'] },
            { name: 'volume', examples: ['35'] },
            { name: 'pages', examples: ['515-517'] },
        ],
    },
    CuratedContent: {
        description: 'Evidence which has been summarized, amalgemated, or curated by some external database/society',
        inherits: ['Evidence', 'Ontology'],
        properties: [
            {
                name: 'year', type: 'integer', examples: [2018], description: 'The year the article was published',
            },
            { name: 'doi', type: 'string', examples: ['doi:10.1037/rmh0000008'] },
            {
                name: 'content',
                description: 'text content being referred to, stored for posterity if required',
                type: 'string',
            },
            {
                name: 'citation', type: 'string', description: 'citation provided by the source entity',
            },
        ],
    },
    Therapy: {
        description: 'Therapy or Drug',
        inherits: ['Ontology'],
        properties: [
            { name: 'mechanismOfAction', type: 'string' },
            { name: 'molecularFormula', type: 'string' },
            { name: 'iupacName', type: 'string' },
            {
                name: 'combinationType', type: 'string', choices: ['sequential', 'combination'],
            },
        ],
    },
    Feature: {
        description: 'Biological Feature. Can be a gene, protein, etc.',
        inherits: ['Ontology'],
        properties: [
            { name: 'start', type: 'integer' },
            { name: 'end', type: 'integer' },
            {
                name: 'biotype',
                mandatory: true,
                nullable: false,
                description: 'The biological type of the feature',
                choices: ['gene', 'protein', 'transcript', 'exon', 'chromosome'],
                examples: ['gene'],
            },
            {
                ...BASE_PROPERTIES.displayName,
                generateDefault: util.displayFeature,
            },
        ],
    },
    AnatomicalEntity: {
        description: 'Physiological structures such as body parts or tissues',
        inherits: ['Ontology'],
    },
    Disease: {
        description: 'a disorder of structure or function in an organism that produces specific signs or symptoms or that affects a specific location',
        inherits: ['Ontology'],
    },
    Pathway: {
        description: 'Primarily describes biological pathways',
        inherits: ['Ontology'],
    },
    Signature: {
        description: 'Characteristic pattern of mutations or changes',
        inherits: ['Ontology'],
        properties: [
            { name: 'aetiology', type: 'string', cast: util.castNullableString },
        ],
    },
    Vocabulary: {
        permissions: {
            default: PERMISSIONS.READ,
            admin: PERMISSIONS.ALL,
            manager: PERMISSIONS.ALL,
        },
        description: 'Curated list of terms used in classifying variants or assigning relevance to statements',
        inherits: ['Ontology'],
        properties: [
            { name: 'shortName', type: 'string', description: 'a shortened form of the vocabulary term. Generally this is used for variantClass type records line del for deletion' },
        ],
    },
};

export default models;
