const util = require('../util');
const {
    EXPOSE_READ,
} = require('../constants');
const {
    BASE_PROPERTIES,
} = require('./util');


module.exports = {
    Ontology: {
        routes: EXPOSE_READ,
        inherits: ['V', 'Biomarker'],
        indices: [
            {
                name: 'Ontology.active',
                type: 'unique',
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
                type: 'FULLTEXT_HASH_INDEX',
                properties: ['name'],
                class: 'Ontology',
            },
            {
                name: 'Ontology.sourceId_fulltext',
                type: 'FULLTEXT_HASH_INDEX',
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
            { name: 'name', description: 'Name of the term', nonEmpty: true },
            {
                name: 'sourceIdVersion',
                description: 'The version of the identifier based on the external database/system',
            },
            { name: 'description', type: 'string' },
            { name: 'longName', type: 'string' },
            {
                name: 'subsets',
                type: 'embeddedset',
                linkedType: 'string',
                description: 'A list of names of subsets this term belongs to',
                cast: item => item.trim().toLowerCase(),
            },
            {
                name: 'deprecated',
                type: 'boolean',
                default: false,
                nullable: false,
                mandatory: true,
                description: 'True when the term was deprecated by the external source',
            },
            { name: 'url', type: 'string' },
            {
                ...BASE_PROPERTIES.displayName,
                default: util.displayOntology,

            },
        ],
        isAbstract: true,
        identifiers: [
            '@class',
            'name',
            'sourceId',
            'source.name',
        ],
    },
    EvidenceLevel: {
        inherits: ['Evidence', 'Ontology'],
        description: 'Evidence Classification Term',
    },
    ClinicalTrial: {
        inherits: ['Evidence', 'Ontology'],
        properties: [
            { name: 'phase', type: 'string', example: '1B' },
            { name: 'size', type: 'integer', description: 'The number of participants in the trial' },
            {
                name: 'startDate', type: 'string', format: 'date', pattern: '^\\d{4}(-\\d{2}(-\\d{2})?)?$',
            },
            {
                name: 'completionDate', type: 'string', format: 'date', pattern: '^\\d{4}(-\\d{2}(-\\d{2})?)?$',
            },
            { name: 'country', type: 'string', description: 'The country the trial is held in' },
            { name: 'city', type: 'string', description: 'The city the trial is held in' },
        ],
    },
    Abstract: {
        inherits: ['Publication'],
        description: 'Abstract from a publication or conference proceeding',
        properties: [
            {
                name: 'meeting', type: 'string', mandatory: true, nullable: false, example: '2011 ASCO Annual Meeting',
            },
            {
                name: 'abstractNumber', type: 'string', mandatory: true, nullable: false, example: '10009',
            },
        ],
        indices: [
            {
                name: 'Abstract.activeMeetingAbstractNumber',
                type: 'unique',
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
                example: 'Bioinformatics',
            },
            {
                name: 'year', type: 'integer', example: 2018, description: 'The year the article was published',
            },
            { name: 'doi', type: 'string', example: 'doi:10.1037/rmh0000008' },
            {
                name: 'content',
                description: 'content of the publication',
                type: 'string',
            },
            {
                name: 'authors', type: 'string', description: 'list of authors involved in the publication',
            },
            {
                name: 'citation', type: 'string', description: 'citation provided by the source entity', example: 'J Clin Oncol 29: 2011 (suppl; abstr 10006)',
            },
            { name: 'issue', example: '3' },
            { name: 'volume', example: '35' },
            { name: 'pages', example: '515-517' },
        ],
    },
    CuratedContent: {
        description: 'Evidence which has been summarized, amalgemated, or curated by some external database/society',
        inherits: ['Evidence', 'Ontology'],
    },
    Therapy: {
        description: 'Therapy or Drug',
        inherits: ['Ontology'],
        properties: [
            { name: 'mechanismOfAction', type: 'string' },
            { name: 'molecularFormula', type: 'string' },
            { name: 'iupacName', type: 'string' },
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
                example: 'gene',
            },
            {
                ...BASE_PROPERTIES.displayName,
                default: util.displayFeature,
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
    },
    Vocabulary: {
        description: 'Curated list of terms used in clasifying variants or assigning relevance to statements',
        inherits: ['Ontology'],
    },
};
