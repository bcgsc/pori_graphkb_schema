const {
    REVIEW_STATUS, EXPOSE_ALL, EXPOSE_NONE,
} = require('../constants');
const {
    BASE_PROPERTIES, defineSimpleIndex,
} = require('./util');
const { DEFAULT_TEMPLATE, chooseDefaultTemplate } = require('../sentenceTemplates');
const util = require('../util');


module.exports = {
    StatementReview: {
        description: 'Review of a statement',
        routes: EXPOSE_NONE,
        embedded: true,
        properties: [
            { ...BASE_PROPERTIES.createdBy, generated: false },
            {
                name: 'status',
                type: 'string',
                choices: REVIEW_STATUS,
                mandatory: true,
                nullable: false,
            },
            { ...BASE_PROPERTIES.createdAt, generated: false },
            { name: 'comment', type: 'string' },
        ],
    },
    Statement: {
        description: 'Decomposed sentences linking variants and ontological terms to implications and evidence',
        routes: EXPOSE_ALL,
        inherits: ['V'],
        properties: [
            {
                name: 'relevance',
                type: 'link',
                linkedClass: 'Vocabulary',
                mandatory: true,
                nullable: false,
                description: 'Adds meaning to a statement and applies to the "subject" element',
            },
            {
                name: 'subject',
                type: 'link',
                linkedClass: 'Biomarker',
                mandatory: true,
                nullable: true,
                description: 'The subject of the statement. For example in a therapeutic efficacy statement this would be a drug',
            },
            {
                name: 'conditions',
                type: 'linkset',
                linkedClass: 'Biomarker',
                mandatory: true,
                nullable: false,
                minItems: 1,
                description: 'This is the statement context. Formally it is a set of conditions which when true result in the overall assertion of the statement',
            },
            {
                name: 'evidence',
                type: 'linkset',
                linkedClass: 'Evidence',
                mandatory: true,
                nullable: false,
                minItems: 1,
                description: 'One or more pieces of evidence (Literature, DB, etc) which support the overall assertion',
            },
            { name: 'description', type: 'string', cast: util.castNullableString },
            { name: 'reviews', type: 'embeddedlist', linkedClass: 'StatementReview' },
            {
                name: 'reviewStatus',
                type: 'string',
                choices: REVIEW_STATUS,
                description: 'The review status of the overall statement. The amalgemated status of all (or no) reviews',
            },
            {
                name: 'sourceId',
                description: 'If the statement is imported from an external source, this is used to track the statement. This is not used for manually entered statements',
            },
            {
                name: 'source',
                description: 'If the statement is imported from an external source, it is linked here',
                linkedClass: 'Source',
                type: 'link',
            },
            {
                name: 'evidenceLevel',
                description: 'A summarization of the supporting evidence for this statment as a category',
                linkedClass: 'EvidenceLevel',
                type: 'linkset',
            },
            {
                name: 'displayNameTemplate',
                description: 'The template used in building the display name',
                type: 'string',
                default: (record) => {
                    try {
                        return chooseDefaultTemplate(record);
                    } catch (err) {
                        return DEFAULT_TEMPLATE;
                    }
                },
                cast: util.castString, // skip default lowercasing
            },
        ],
        indices: [
            defineSimpleIndex({ model: 'Statement', property: 'subject' }),
            defineSimpleIndex({ model: 'Statement', property: 'relevance' }),
            defineSimpleIndex({ model: 'Statement', property: 'source' }),
            defineSimpleIndex({ model: 'Statement', property: 'evidenceLevel' }),
            defineSimpleIndex({ model: 'Statement', property: 'conditions' }),
            defineSimpleIndex({ model: 'Statement', property: 'evidence' }),
            {
                name: 'Statement.active',
                type: 'unique',
                metadata: { ignoreNullValues: false },
                properties: [
                    'deletedAt',
                    'subject',
                    'relevance',
                    'source',
                    'sourceId',
                    'conditions',
                    'evidence',
                ],
                class: 'Statement',
            },
        ],

    },
};
