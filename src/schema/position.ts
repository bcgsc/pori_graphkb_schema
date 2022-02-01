import { EXPOSE_NONE } from '../constants';
import * as util from '../util';
import { BASE_PROPERTIES } from './util';

export default {
    Position: {
        routes: EXPOSE_NONE,
        properties: [
            { ...BASE_PROPERTIES['@class'] },
        ],
        embedded: true,
        isAbstract: true,
    },
    ProteinPosition: {
        description: 'position on a protein reference sequence. amino acid numbering is p.1, p.2, p.3, …, etc. from the first to the last amino acid of the reference sequence (https://varnomen.hgvs.org/bg-material/numbering)',
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'pos', type: 'integer', min: 1, mandatory: true, example: 12, nullable: true, description: 'The Amino Acid number',
            },
            {
                name: 'refAA', type: 'string', cast: util.uppercase, example: 'G', pattern: '^[A-Z*?]$', description: 'The reference Amino Acid (single letter notation)',
            },
        ],
    },
    CytobandPosition: {
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'arm', mandatory: true, nullable: false, choices: ['p', 'q'],
            },
            {
                name: 'majorBand', type: 'integer', min: 1, example: '11',
            },
            {
                name: 'minorBand', type: 'integer', min: 1, example: '1',
            },
        ],
    },
    GenomicPosition: {
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true, nullable: true, description: 'The genomic/nucleotide number',
        }],
    },
    ExonicPosition: {
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true, nullable: true, description: 'The exon number',
        }],
    },
    IntronicPosition: {
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true, nullable: true,
        }],
    },
    CdsPosition: {
        description: 'position on a coding DNA reference sequences. nucleotide numbering is based on the annotated protein isoform, the major translation product (https://varnomen.hgvs.org/bg-material/numbering).',
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'pos', type: 'integer', mandatory: true, example: 55, nullable: true,
            },
            { name: 'offset', type: 'integer', example: -11 },
        ],
    },
    NonCdsPosition: {
        description: 'position on a non-coding DNA reference sequence',
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'pos', type: 'integer', min: 1, mandatory: true, example: 55, nullable: true,
            },
            {
                name: 'offset', type: 'integer', example: -11, description: 'distance from the nearest exon boundary (pos)',
            },
        ],

    },
    RnaPosition: {
        description: 'position on a RNA reference sequence. nucleotide numbering for a RNA reference sequence follows that of the associated coding or non-coding DNA reference sequence; nucleotide r.123 relates to c.123 or n.123 (https://varnomen.hgvs.org/bg-material/numbering).',
        routes: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'pos', type: 'integer', min: 1, mandatory: true, example: 55, nullable: true,
            },
            {
                name: 'offset', type: 'integer', example: -11, description: 'distance from the nearest cds exon boundary',
            },
        ],
    },
};
