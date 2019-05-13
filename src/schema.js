/**
 * Repsonsible for defining the schema.
 * @module schema
 */
const uuidV4 = require('uuid/v4');
const omit = require('lodash.omit');

const {position, variant: {VariantNotation}} = require('@bcgsc/knowledgebase-parser');


const {
    PERMISSIONS, EXPOSE_NONE, EXPOSE_ALL, EXPOSE_READ
} = require('./constants');
const {ClassModel} = require('./model');
const {Property} = require('./property');
const util = require('./util');
const {AttributeError} = require('./error');


/**
 * Given some set of positions, create position object to check they are valid
 * and create the breakpoint representation strings from them that are used for indexing
 */
const generateBreakRepr = (start, end) => {
    if (!start && !end) {
        return undefined;
    }
    if ((start && !start['@class']) || (end && !end['@class'])) {
        throw new AttributeError('positions must include the @class attribute to specify the position type');
    }
    if ((end && !start)) {
        throw new AttributeError('both start and end are required to define a range');
    }
    const posClass = start['@class'];
    const repr = position.breakRepr(
        position.PREFIX_CLASS[posClass],
        new position[posClass](start),
        end
            ? new position[posClass](end)
            : null
    );
    return repr;
};


const ontologyPreview = (opt) => {
    const {name, sourceId, sourceIdVersion} = opt;
    if (name) {
        return name;
    }
    if (sourceIdVersion) {
        return `${sourceId}.${sourceIdVersion}`;
    }
    return sourceId;
};

// Special preview functions
const previews = {
    Source: opt => opt.name,
    // Name is usually more aesthetically pleasing, sourceId is mandatory for fallback.
    // Source and sourceId are mandatory, and name is mandatory on source.
    Publication: opt => `${opt.source.name}: ${opt.sourceId}`,
    Feature: opt => ontologyPreview(opt).toUpperCase(),
    // Use kb parser to find HGVS notation
    PositionalVariant: (opt) => {
        const {
            break1Start,
            break1End,
            break2Start,
            break2End,
            untemplatedSeq,
            untemplatedSeqSize,
            truncation
        } = opt;

        const variantNotation = {
            break1Start,
            break1End,
            break2Start,
            break2End,
            untemplatedSeq,
            untemplatedSeqSize,
            truncation
        };

        variantNotation.prefix = position.CLASS_PREFIX[break1Start['@class']];
        for (const key of ['reference1', 'reference2', 'type']) {
            if (opt[key] && opt[key]['@class']) {
                // Stringify linked records
                variantNotation[key] = SCHEMA_DEFN[opt[key]['@class']].getPreview(opt[key]);
            } else {
                variantNotation[key] = opt[key];
            }
        }
        return (new VariantNotation(variantNotation)).toString();
    },
    // Format type and references
    CategoryVariant: (opt) => {
        const {
            type,
            reference1,
            reference2
        } = opt;
        // reference1 and type are mandatory
        let previewFunction = ontologyPreview;
        try {
            previewFunction = SCHEMA_DEFN[reference1['@class']].getPreview;
        } catch (err) {}
        let result = `${
            type.name || type
        } variant on ${
            reference1.biotype || ''
        }${
            reference1.biotype
                ? ' '
                : ''
        }${previewFunction(reference1)}`;

        if (reference2) {
            result = `${result} and ${
                reference2.biotype || ''
            }${
                reference2.biotype
                    ? ' '
                    : ''
            }${previewFunction(reference2)}`;
        }

        return result;
    },
    // Formats relevance and ontology that statement applies to.
    Statement: (opt) => {
        const {relevance, appliesTo} = opt;
        const rel = (relevance && SCHEMA_DEFN.Vocabulary.getPreview(relevance)) || '';
        const appl = (appliesTo && ` to ${SCHEMA_DEFN[appliesTo['@class']].getPreview(appliesTo)}`) || '';
        return `${rel}${appl}`;
    },
    Vocabulary: (opt) => {
        const {source, sourceId, name} = opt;
        let result = `${name || sourceId}`;
        if (source) {
            result = `${result} (${
                sourceId !== source.name
                    ? sourceId
                    : source.name || source
            })`;
        }
        return result;
    },
    SimpleOntology: (opt) => {
        const {source, sourceId} = opt;
        let result = `${sourceId}`;
        if (source && source.name) {
            result = `${result} (${source.name})`;
        }
        return result;
    }
};


const BASE_PROPERTIES = {
    '@rid': {
        name: '@rid',
        pattern: '^#\\d+:\\d+$',
        description: 'The record identifier',
        cast: util.castToRID,
        generated: true
    },
    '@class': {
        name: '@class',
        description: 'The database class this record belongs to',
        cast: util.trimString,
        generated: false
    },
    uuid: {
        name: 'uuid',
        type: 'string',
        mandatory: true,
        nullable: false,
        readOnly: true,
        description: 'Internal identifier for tracking record history',
        cast: util.castUUID,
        default: uuidV4,
        generated: true,
        example: '4198e211-e761-4771-b6f8-dadbcc44e9b9'
    },
    createdAt: {
        name: 'createdAt',
        type: 'long',
        mandatory: true,
        nullable: false,
        description: 'The timestamp at which the record was created',
        default: util.timeStampNow,
        generated: true,
        example: 1547245339649
    },
    deletedAt: {
        name: 'deletedAt',
        type: 'long',
        description: 'The timestamp at which the record was deleted',
        nullable: false,
        generated: true,
        example: 1547245339649
    },
    createdBy: {
        name: 'createdBy',
        type: 'link',
        mandatory: true,
        nullable: false,
        linkedClass: 'User',
        description: 'The user who created the record',
        generated: true,
        example: '#31:1'
    },
    deletedBy: {
        name: 'deletedBy',
        type: 'link',
        linkedClass: 'User',
        nullable: false,
        description: 'The user who deleted the record',
        generated: true,
        example: '#31:1'
    },
    history: {
        name: 'history',
        type: 'link',
        nullable: false,
        description: 'Link to the previous version of this record',
        generated: true,
        example: '#31:1'
    },
    groupRestrictions: {
        name: 'groupRestrictions',
        type: 'linkset',
        linkedClass: 'UserGroup',
        description: 'user groups allowed to interact with this record',
        example: ['#33:1', '#33:2']
    },
    in: {
        name: 'in',
        type: 'link',
        description: 'The record ID of the vertex the edge goes into, the target/destination vertex',
        mandatory: true,
        nullable: false
    },
    out: {
        name: 'out',
        type: 'link',
        description: 'The record ID of the vertex the edge comes from, the source vertex',
        mandatory: true,
        nullable: false
    }
};

const activeUUID = className => ({
    name: `Active${className}UUID`,
    type: 'unique',
    metadata: {ignoreNullValues: false},
    properties: ['uuid', 'deletedAt'],
    class: className
});

const SCHEMA_DEFN = {
    V: {
        description: 'Vertices',
        expose: EXPOSE_READ,
        isAbstract: true,
        properties: [
            {...BASE_PROPERTIES['@rid']},
            {...BASE_PROPERTIES['@class']},
            {...BASE_PROPERTIES.uuid},
            {...BASE_PROPERTIES.createdAt},
            {...BASE_PROPERTIES.createdBy},
            {...BASE_PROPERTIES.deletedAt},
            {...BASE_PROPERTIES.deletedBy},
            {...BASE_PROPERTIES.history},
            {name: 'comment', type: 'string'},
            {...BASE_PROPERTIES.groupRestrictions}
        ],
        identifiers: ['@class', '@rid', 'preview'],
        indices: [activeUUID('V')]
    },
    E: {
        description: 'Edges',
        expose: EXPOSE_READ,
        isAbstract: true,
        isEdge: true,
        properties: [
            {...BASE_PROPERTIES['@rid']},
            {...BASE_PROPERTIES['@class']},
            {...BASE_PROPERTIES.uuid},
            {...BASE_PROPERTIES.createdAt},
            {...BASE_PROPERTIES.createdBy},
            {...BASE_PROPERTIES.deletedAt},
            {...BASE_PROPERTIES.deletedBy},
            {...BASE_PROPERTIES.history},
            {name: 'comment', type: 'string'}
        ],
        identifiers: ['@class', '@rid'],
        indices: [activeUUID('E')]
    },
    UserGroup: {
        description: 'The role or group which users can belong to. Defines permissions',
        properties: [
            {...BASE_PROPERTIES['@rid']},
            {...BASE_PROPERTIES['@class']},
            {
                name: 'name', mandatory: true, nullable: false, cast: util.castString
            },
            {...BASE_PROPERTIES.uuid},
            {...BASE_PROPERTIES.createdAt},
            {...BASE_PROPERTIES.createdBy, mandatory: false},
            {...BASE_PROPERTIES.deletedAt},
            {...BASE_PROPERTIES.deletedBy},
            {...BASE_PROPERTIES.history},
            {name: 'permissions', type: 'embedded', linkedClass: 'Permissions'},
            {name: 'description'}
        ],
        indices: [
            {
                name: 'ActiveUserGroupName',
                type: 'unique',
                metadata: {ignoreNullValues: false},
                properties: ['name', 'deletedAt'],
                class: 'UserGroup'
            },
            activeUUID('UserGroup')
        ],
        identifiers: ['name']
    },
    Permissions: {
        expose: EXPOSE_NONE,
        properties: [],
        embedded: true
    },
    Evidence: {
        expose: EXPOSE_READ,
        description: 'Classes which can be used as support for statements',
        isAbstract: true
    },
    Biomarker: {
        expose: EXPOSE_READ,
        isAbstract: true
    },
    User: {
        properties: [
            {...BASE_PROPERTIES['@rid']},
            {...BASE_PROPERTIES['@class']},
            {
                name: 'name',
                mandatory: true,
                nullable: false,
                description: 'The username'
            },
            {
                name: 'groups',
                type: 'linkset',
                linkedClass: 'UserGroup',
                description: 'Groups this user belongs to. Defines permissions for the user'
            },
            {...BASE_PROPERTIES.uuid},
            {...BASE_PROPERTIES.createdAt},
            {...BASE_PROPERTIES.createdBy, mandatory: false},
            {...BASE_PROPERTIES.deletedAt},
            {...BASE_PROPERTIES.deletedBy},
            {...BASE_PROPERTIES.history},
            {...BASE_PROPERTIES.groupRestrictions}
        ],
        indices: [
            {
                name: 'ActiveUserName',
                type: 'unique',
                metadata: {ignoreNullValues: false},
                properties: ['name', 'deletedAt'],
                class: 'User'
            },
            activeUUID('User')
        ],
        identifiers: ['name', '@rid']
    },
    Source: {
        description: 'External database, collection, or other authority which is used as reference for other entries',
        inherits: ['V', 'Evidence'],
        properties: [
            {
                name: 'name',
                mandatory: true,
                nullable: false,
                description: 'Name of the source'
            },
            {name: 'version', description: 'The source version'},
            {name: 'url', type: 'string'},
            {name: 'description', type: 'string'},
            {
                name: 'usage',
                description: 'Link to the usage/licensing information associated with this source'
            }
        ],
        indices: [
            {
                name: 'Source.active',
                type: 'unique',
                metadata: {ignoreNullValues: false},
                properties: ['name', 'version', 'deletedAt'],
                class: 'Source'
            }
        ],
        identifiers: ['name', '@rid'],
        getPreview: previews.Source
    },
    Ontology: {
        expose: EXPOSE_READ,
        inherits: ['V'],
        indices: [
            {
                name: 'Ontology.active',
                type: 'unique',
                metadata: {ignoreNullValues: false},
                properties: ['source', 'sourceId', 'name', 'deletedAt', 'sourceIdVersion'],
                class: 'Ontology'
            },
            {
                name: 'Ontology.name',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['name'],
                class: 'Ontology'
            },
            {
                name: 'Ontology.sourceId',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['sourceId'],
                class: 'Ontology'
            },
            {
                name: 'Ontology.name_fulltext',
                type: 'FULLTEXT_HASH_INDEX',
                properties: ['name'],
                class: 'Ontology'
            },
            {
                name: 'Ontology.sourceId_fulltext',
                type: 'FULLTEXT_HASH_INDEX',
                properties: ['sourceId'],
                class: 'Ontology'
            }
        ],
        properties: [
            {
                name: 'source',
                type: 'link',
                mandatory: true,
                nullable: false,
                linkedClass: 'Source',
                description: 'Link to the source from which this record is defined'
            },
            {
                name: 'sourceId',
                mandatory: true,
                nullable: false,
                nonEmpty: true,
                description: 'The identifier of the record/term in the external source database/system'
            },
            {
                name: 'dependency',
                type: 'link',
                description: 'Mainly for alias records. If this term is defined as a part of another term, this should link to the original term'
            },
            {name: 'name', description: 'Name of the term', nonEmpty: true},
            {
                name: 'sourceIdVersion',
                description: 'The version of the identifier based on the external database/system'
            },
            {name: 'description', type: 'string'},
            {name: 'longName', type: 'string'},
            {
                name: 'subsets',
                type: 'embeddedset',
                linkedType: 'string',
                description: 'A list of names of subsets this term belongs to',
                cast: item => item.trim().toLowerCase()
            },
            {
                name: 'deprecated',
                type: 'boolean',
                default: false,
                nullable: false,
                mandatory: true,
                description: 'True when the term was deprecated by the external source'
            },
            {name: 'url', type: 'string'}
        ],
        isAbstract: true,
        identifiers: [
            '@class',
            'name',
            'sourceId',
            'source.name'
        ],
        getPreview: ontologyPreview
    },
    EvidenceLevel: {
        inherits: ['Evidence', 'Ontology'],
        description: 'Evidence Classification Term',
        getPreview: previews.SimpleOntology
    },
    ClinicalTrial: {
        inherits: ['Evidence', 'Ontology'],
        properties: [
            {name: 'phase', type: 'string'},
            {name: 'size', type: 'integer'},
            {name: 'startYear', type: 'integer', example: 2018},
            {name: 'completionYear', type: 'integer', example: 2019},
            {name: 'country', type: 'string'},
            {name: 'city', type: 'string'}
        ],
        getPreview: previews.SimpleOntology
    },
    Publication: {
        description: 'a book, journal, manuscript, or article',
        inherits: ['Evidence', 'Ontology'],
        properties: [
            {
                name: 'journalName',
                description: 'Name of the journal where the article was published',
                example: 'Bioinformatics'
            },
            {name: 'year', type: 'integer', example: 2018}
        ],
        getPreview: previews.Publication
    },
    CuratedContent: {
        description: 'Evidence which has been summarized, amalgemated, or curated by some external database/society',
        inherits: ['Evidence', 'Ontology'],
        getPreview: previews.Publication
    },
    Therapy: {
        description: 'Therapy or Drug',
        inherits: ['Ontology', 'Biomarker'],
        properties: [
            {name: 'mechanismOfAction', type: 'string'},
            {name: 'molecularFormula', type: 'string'},
            {name: 'iupacName', type: 'string'}
        ]
    },
    Feature: {
        description: 'Biological Feature. Can be a gene, protein, etc.',
        inherits: ['Ontology', 'Biomarker'],
        properties: [
            {name: 'start', type: 'integer'},
            {name: 'end', type: 'integer'},
            {
                name: 'biotype',
                mandatory: true,
                nullable: false,
                description: 'The biological type of the feature',
                choices: ['gene', 'protein', 'transcript', 'exon', 'chromosome'],
                example: 'gene'
            }
        ],
        getPreview: previews.Feature
    },
    Position: {
        expose: EXPOSE_NONE,
        properties: [
            {...BASE_PROPERTIES['@class']}
        ],
        embedded: true,
        isAbstract: true,
        identifiers: [
            '@class',
            'pos'
        ]
    },
    ProteinPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'pos', type: 'integer', min: 1, mandatory: true, example: 12
            },
            {
                name: 'refAA', type: 'string', cast: util.uppercase, example: 'G', pattern: '^[A-Z*?]$'
            }
        ],
        identifiers: [
            '@class',
            'pos',
            'refAA'
        ]
    },
    CytobandPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'arm', mandatory: true, nullable: false, choices: ['p', 'q']
            },
            {
                name: 'majorBand', type: 'integer', min: 1, example: '11'
            },
            {
                name: 'minorBand', type: 'integer', min: 1, example: '1'
            }
        ],
        identifiers: [
            '@class',
            'arm',
            'majorBand',
            'minorBand'
        ]
    },
    GenomicPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true
        }]
    },
    ExonicPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true
        }]
    },
    IntronicPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true
        }]
    },
    CdsPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'pos', type: 'integer', min: 1, mandatory: true, example: 55
            },
            {name: 'offset', type: 'integer', example: -11}
        ],
        identifiers: [
            '@class',
            'pos',
            'offset'
        ]
    },
    Variant: {
        description: 'Any deviation from the norm (ex. high expression) with respect to some reference object (ex. a gene)',
        expose: EXPOSE_READ,
        inherits: ['V', 'Biomarker'],
        properties: [
            {
                name: 'type',
                type: 'link',
                mandatory: true,
                nullable: false,
                linkedClass: 'Vocabulary'
            },
            {name: 'zygosity', choices: ['heterozygous', 'homozygous']},
            {
                name: 'germline',
                type: 'boolean',
                description: 'Flag to indicate if the variant is germline (vs somatic)'
            }
        ],
        isAbstract: true,
        identifiers: [
            '@class',
            'type.name'
        ],
        indices: [
            {
                name: 'Variant.type',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['type'],
                class: 'Variant'
            }
        ]
    },
    PositionalVariant: {
        description: 'Variants which can be described by there position on some reference sequence',
        inherits: ['Variant'],
        properties: [
            {
                name: 'reference1',
                mandatory: true,
                type: 'link',
                linkedClass: 'Feature',
                nullable: false
            },
            {
                name: 'reference2', type: 'link', linkedClass: 'Feature', nullable: false
            },
            {
                name: 'break1Start',
                type: 'embedded',
                linkedClass: 'Position',
                nullable: false,
                mandatory: true
            },
            {name: 'break1End', type: 'embedded', linkedClass: 'Position'},
            {
                name: 'break1Repr',
                type: 'string',
                generationDependencies: true,
                generated: true,
                default: record => generateBreakRepr(record.break1Start, record.break1End),
                cast: string => `${string.slice(0, 2)}${string.slice(2).toUpperCase()}`
            },
            {name: 'break2Start', type: 'embedded', linkedClass: 'Position'},
            {name: 'break2End', type: 'embedded', linkedClass: 'Position'},
            {
                name: 'break2Repr',
                type: 'string',
                generationDependencies: true,
                generated: true,
                default: record => generateBreakRepr(record.break2Start, record.break2End),
                cast: string => `${string.slice(0, 2)}${string.slice(2).toUpperCase()}`
            },
            {name: 'refSeq', type: 'string', cast: util.uppercase},
            {name: 'untemplatedSeq', type: 'string', cast: util.uppercase},
            {
                name: 'untemplatedSeqSize',
                type: 'integer',
                description: 'The length of the untemplated sequence. Useful when we know the number of bases inserted but not what they are'
            },
            {name: 'truncation', type: 'integer'},
            {
                name: 'assembly',
                type: 'string',
                choices: ['Hg18', 'GRCh38', 'GRCh37', 'Hg19'],
                description: 'Flag which is optionally used for genomic variants that are not linked to a fixed assembly reference'
            }
        ],
        indices: [
            {
                name: 'PositionalVariant.active',
                type: 'unique',
                metadata: {ignoreNullValues: false},
                properties: [
                    'break1Repr',
                    'break2Repr',
                    'deletedAt',
                    'germline',
                    'refSeq',
                    'reference1',
                    'reference2',
                    'type',
                    'untemplatedSeq',
                    'untemplatedSeqSize',
                    'zygosity',
                    'truncation',
                    'assembly'
                ],
                class: 'PositionalVariant'
            },
            {
                name: 'PositionalVariant.reference1',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: {ignoreNullValues: true},
                properties: [
                    'reference1'
                ],
                class: 'PositionalVariant'
            },
            {
                name: 'PositionalVariant.reference2',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: {ignoreNullValues: true},
                properties: [
                    'reference2'
                ],
                class: 'PositionalVariant'
            }
        ],
        identifiers: [
            'type.name',
            'reference1.name',
            'reference2.name',
            'preview'
        ],
        getPreview: previews.PositionalVariant
    },
    CategoryVariant: {
        description: 'Variants which cannot be described by a particular position and use common terms instead',
        inherits: ['Variant'],
        properties: [
            {
                name: 'reference1',
                mandatory: true,
                type: 'link',
                linkedClass: 'Ontology',
                nullable: false
            },
            {
                name: 'reference2', type: 'link', linkedClass: 'Ontology', nullable: false
            }
        ],
        indices: [
            {
                name: 'CategoryVariant.active',
                type: 'unique',
                metadata: {ignoreNullValues: false},
                properties: [
                    'deletedAt',
                    'germline',
                    'reference1',
                    'reference2',
                    'type',
                    'zygosity'
                ],
                class: 'CategoryVariant'
            },
            {
                name: 'CategoryVariant.reference1',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: {ignoreNullValues: true},
                properties: [
                    'reference1'
                ],
                class: 'CategoryVariant'
            },
            {
                name: 'CategoryVariant.reference2',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: {ignoreNullValues: true},
                properties: [
                    'reference2'
                ],
                class: 'CategoryVariant'
            }
        ],
        identifiers: [
            'type.name',
            'reference1.name',
            'reference2.name'
        ],
        getPreview: previews.CategoryVariant
    },
    Statement: {
        description: 'Decomposed sentences linking variants and ontological terms to implications and evidence',
        expose: EXPOSE_ALL,
        inherits: ['V'],
        properties: [
            {
                name: 'relevance',
                type: 'link',
                linkedClass: 'Vocabulary',
                mandatory: true,
                nullable: false
            },
            {
                name: 'appliesTo',
                type: 'link',
                linkedClass: 'Ontology',
                mandatory: true,
                nullable: true
            },
            {name: 'description', type: 'string'},
            {
                name: 'reviewStatus',
                type: 'string',
                choices: ['pending', 'not required', 'passed', 'failed']
            },
            {name: 'reviewComment', type: 'string'},
            {
                name: 'sourceId',
                description: 'If the statement is imported from an external source, this is used to track the statement'
            },
            {
                name: 'source',
                description: 'If the statement is imported from an external source, it is linked here',
                linkedClass: 'Source',
                type: 'link'
            },
            {
                name: 'evidenceLevel',
                description: 'A summarization of the supporting evidence for this statment as a category',
                linkedClass: 'EvidenceLevel',
                type: 'link'
            }
        ],
        indices: [
            {
                name: 'Statement.appliesTo',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['appliesTo'],
                class: 'Statement'
            },
            {
                name: 'Statement.relevance',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['relevance'],
                class: 'Statement'
            }
        ],
        identifiers: [
            'appliesTo.name',
            'relevance.name',
            'source.name',
            'reviewStatus'
        ],
        getPreview: previews.Statement

    },
    AnatomicalEntity: {
        description: 'Physiological structures such as body parts or tissues',
        inherits: ['Ontology', 'Biomarker']
    },
    Disease: {
        description: 'a disorder of structure or function in an organism that produces specific signs or symptoms or that affects a specific location',
        inherits: ['Ontology', 'Biomarker']
    },
    Pathway: {
        description: 'Primarily describes biological pathways',
        inherits: ['Ontology', 'Biomarker']
    },
    Signature: {
        description: 'Characteristic pattern of mutations or changes',
        inherits: ['Ontology', 'Biomarker']
    },
    Vocabulary: {
        description: 'Curated list of terms used in clasifying variants or assigning relevance to statements',
        inherits: ['Ontology']
    },
    CatalogueVariant: {
        description: 'Variant as described by an identifier in an external database/source',
        inherits: ['Ontology', 'Biomarker']
    },
    AliasOf: {
        description: 'The source record is an equivalent representation of the target record, both of which are from the same source'

    },
    Cites: {description: 'Generally refers to relationships between publications. For example, some article cites another'},
    CrossReferenceOf: {description: 'The source record is an equivalent representation of the target record from a different source'},
    DeprecatedBy: {description: 'The target record is a newer version of the source record'},
    ElementOf: {description: 'The source record is part of (or contained within) the target record'},
    GeneralizationOf: {description: 'The source record is a less specific (or more general) instance of the target record'},
    ImpliedBy: {
        description: 'Some source record (ex. a variant) implies a statement',
        sourceModel: 'Statement',
        targetModel: 'Biomarker'
    },
    Infers: {
        description: 'Given the source record, the target record is also expected. For example given some genomic variant we infer the protein change equivalent',
        sourceModel: 'Variant',
        targetModel: 'Variant'
    },
    SubClassOf: {description: 'The source record is a subset of the target record'},
    SupportedBy: {
        description: 'A statement is supported by some evidence record',
        sourceModel: 'Statement',
        targetModel: 'Evidence'
    },
    TargetOf: {description: 'The source record is a target of the target record. For example some gene is the target of a particular drug'}
};


// initialize the schema definition
((schema) => {
    // Add the edge classes
    for (const name of [
        'AliasOf',
        'Cites',
        'CrossReferenceOf',
        'DeprecatedBy',
        'ElementOf',
        'GeneralizationOf',
        'ImpliedBy',
        'Infers',
        'OppositeOf',
        'SubClassOf',
        'SupportedBy',
        'TargetOf'
    ]) {
        const sourceProp = {name: 'source', type: 'link', linkedClass: 'Source'};
        if (!['SupportedBy', 'ImpliedBy'].includes(name)) {
            sourceProp.mandatory = true;
            sourceProp.nullable = false;
        }
        let reverseName;
        if (name.endsWith('Of')) {
            reverseName = `Has${name.slice(0, name.length - 2)}`;
        } else if (name === 'SupportedBy') {
            reverseName = 'Supports';
        } else if (name.endsWith('By')) {
            reverseName = `${name.slice(0, name.length - 3)}s`;
        } else if (name === 'Infers') {
            reverseName = 'InferredBy';
        } else {
            reverseName = `${name.slice(0, name.length - 1)}dBy`;
        }
        schema[name] = Object.assign({
            isEdge: true,
            reverseName,
            inherits: ['E'],
            sourceModel: 'Ontology',
            targetModel: 'Ontology',
            properties: [
                {...BASE_PROPERTIES.in},
                {...BASE_PROPERTIES.out},
                sourceProp
            ],
            indices: [ // add index on the class so it doesn't apply across classes
                {
                    name: `${name}.restrictMultiplicity`,
                    type: 'unique',
                    metadata: {ignoreNullValues: false},
                    properties: ['deletedAt', 'in', 'out', 'source'],
                    class: name
                }
            ]
        }, schema[name] || {});
        if (name === 'SupportedBy') {
            schema[name].properties.push(...[
                {name: 'level', type: 'link', linkedClass: 'EvidenceLevel'},
                {name: 'summary', description: 'Generally a quote from the supporting source which describes the pertinent details with resect to the statement it supports'}
            ]);
        }
    }

    // Set the name to match the key
    // initialize the models
    for (const name of Object.keys(schema)) {
        if (name !== 'Permissions' && !schema[name].embedded) {
            schema.Permissions.properties.push({
                min: PERMISSIONS.NONE, max: PERMISSIONS.ALL, type: 'integer', nullable: false, readOnly: false, name
            });
        }
    }
    const models = {};
    for (const [name, model] of Object.entries(schema)) {
        // for each fast index, mark the field as searchable
        const indexed = new Set();
        const fulltext = new Set();
        for (const index of model.indices || []) {
            if (index.properties.length === 1) {
                const [propertyName] = index.properties;
                if (index.type === 'NOTUNIQUE_HASH_INDEX') {
                    indexed.add(propertyName);
                } else if (index.type === 'FULLTEXT_HASH_INDEX' || index.type.includes('LUCENE')) {
                    fulltext.add(propertyName);
                }
            }
        }
        model.name = name;
        const properties = {};
        for (const prop of model.properties || []) {
            properties[prop.name] = new Property({
                ...prop,
                indexed: indexed.has(prop.name),
                fulltextIndexed: fulltext.has(prop.name)
            });
        }
        models[name] = new ClassModel(Object.assign(
            {properties},
            omit(model, ['inherits', 'properties'])
        ));
    }
    // link the inherited models and linked models
    for (const model of Object.values(models)) {
        const defn = schema[model.name];
        for (const parent of defn.inherits || []) {
            if (models[parent] === undefined) {
                throw new Error(`Schema definition error. Expected model ${parent} is not defined`);
            }
            models[model.name]._inherits.push(models[parent]);
            models[parent].subclasses.push(models[model.name]);
        }
        for (const prop of Object.values(model._properties)) {
            if (prop.linkedClass) {
                if (models[prop.linkedClass] === undefined) {
                    throw new Error(`Schema definition error. Expected model ${prop.linkedClass} is not defined`);
                }
                prop.linkedClass = models[prop.linkedClass];
            }
        }
    }
    Object.assign(SCHEMA_DEFN, models);
})(SCHEMA_DEFN);

module.exports = SCHEMA_DEFN;
