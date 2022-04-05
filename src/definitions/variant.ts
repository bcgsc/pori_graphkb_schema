import * as util from '../util';
import { EXPOSE_READ } from '../constants';

import { BASE_PROPERTIES, castBreakRepr, generateBreakRepr } from './util';
import { ModelTypeDefinition } from '../types';

const models: Record<string, ModelTypeDefinition> = {
    Variant: {
        description: 'Any deviation from the norm (ex. high expression) with respect to some reference object (ex. a gene)',
        routes: EXPOSE_READ,
        inherits: ['V', 'Biomarker'],
        properties: [
            {
                name: 'type',
                type: 'link',
                mandatory: true,
                nullable: false,
                linkedClass: 'Vocabulary',
                description: 'The variant classification',
            },
            { name: 'zygosity', choices: ['heterozygous', 'homozygous'] },
            {
                name: 'germline',
                type: 'boolean',
                description: 'Flag to indicate if the variant is germline (vs somatic)',
            },
        ],
        isAbstract: true,
        indices: [
            {
                name: 'Variant.type',
                type: 'NOTUNIQUE_HASH_INDEX',
                properties: ['type'],
                class: 'Variant',
            },
        ],
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
                nullable: false,
                description: 'Generally this is the gene which a mutation or variant is defined with respect to',
            },
            {
                name: 'reference2',
                type: 'link',
                linkedClass: 'Feature',
                description: 'This is only used for variants involving more than one feature (ex. fusions)',
            },
            {
                name: 'break1Start',
                type: 'embedded',
                linkedClass: 'Position',
                nullable: false,
                mandatory: true,
                description: 'position of the first breakpoint',
            },
            {
                ...BASE_PROPERTIES.displayName,
            },
            {
                name: 'break1End',
                type: 'embedded',
                linkedClass: 'Position',
                description: 'used in combination with break1Start to indicate the position of the first breakpoint is uncertain and must be represented with a range',
            },
            {
                name: 'break1Repr',
                type: 'string',
                generationDependencies: true,
                generated: true,
                default: (record) => generateBreakRepr(record.break1Start, record.break1End),
                cast: castBreakRepr,
            },
            {
                name: 'break2Start', type: 'embedded', linkedClass: 'Position', description: 'position of the second breakpoint',
            },
            {
                name: 'break2End',
                type: 'embedded',
                linkedClass: 'Position',
                description: 'used in combination with break2Start to indicate the position of the second breakpoint is uncertain and must be represented with a range',
            },
            {
                name: 'break2Repr',
                type: 'string',
                generationDependencies: true,
                generated: true,
                default: (record) => generateBreakRepr(record.break2Start, record.break2End),
                cast: castBreakRepr,
            },
            {
                name: 'refSeq', type: 'string', cast: util.uppercase, description: 'the variants reference sequence', examples: ['ATGC'],
            },
            {
                name: 'untemplatedSeq', type: 'string', cast: util.uppercase, description: 'Untemplated or alternative sequence',
            },
            {
                name: 'untemplatedSeqSize',
                type: 'integer',
                description: 'The length of the untemplated sequence. Useful when we know the number of bases inserted but not what they are',
            },
            {
                name: 'truncation',
                type: 'integer',
                description: 'Used with frameshift mutations to indicate the position of the new stop codon',
            },
            {
                name: 'assembly',
                type: 'string',
                pattern: '^(hg\\d+)|(grch\\d+)$',
                description: 'Flag which is optionally used for genomic variants that are not linked to a fixed assembly reference',
            },
            {
                name: 'hgvsType', type: 'string', examples: ['delins'], description: 'the short form of this type to use in building an HGVS-like representation',
            },
        ],
        indices: [
            {
                name: 'PositionalVariant.active',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
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
                    'assembly',
                ],
                class: 'PositionalVariant',
            },
            {
                name: 'PositionalVariant.reference1',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: { ignoreNullValues: true },
                properties: [
                    'reference1',
                ],
                class: 'PositionalVariant',
            },
            {
                name: 'PositionalVariant.reference2',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: { ignoreNullValues: true },
                properties: [
                    'reference2',
                ],
                class: 'PositionalVariant',
            },
        ],
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
                nullable: false,
                description: 'Generally this is the gene which a mutation or variant is defined with respect to',
            },
            {
                name: 'reference2', type: 'link', linkedClass: 'Ontology', description: 'This is only used for variants involving more than one feature (ex. fusions)',
            },
            {
                ...BASE_PROPERTIES.displayName,
            },
        ],
        indices: [
            {
                name: 'CategoryVariant.active',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
                properties: [
                    'deletedAt',
                    'germline',
                    'reference1',
                    'reference2',
                    'type',
                    'zygosity',
                ],
                class: 'CategoryVariant',
            },
            {
                name: 'CategoryVariant.reference1',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: { ignoreNullValues: true },
                properties: [
                    'reference1',
                ],
                class: 'CategoryVariant',
            },
            {
                name: 'CategoryVariant.reference2',
                type: 'NOTUNIQUE_HASH_INDEX',
                metadata: { ignoreNullValues: true },
                properties: [
                    'reference2',
                ],
                class: 'CategoryVariant',
            },
        ],
    },
    CatalogueVariant: {
        description: 'Variant as described by an identifier in an external database/source',
        inherits: ['Ontology'],
    },
};

export default models;
