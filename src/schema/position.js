const {
    EXPOSE_NONE,
} = require('../constants');
const util = require('../util');
const {
    BASE_PROPERTIES,
} = require('./util');


module.exports = {
    Position: {
        expose: EXPOSE_NONE,
        properties: [
            { ...BASE_PROPERTIES['@class'] },
        ],
        embedded: true,
        isAbstract: true,
        identifiers: [
            '@class',
            'pos',
        ],
    },
    ProteinPosition: {
        expose: EXPOSE_NONE,
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
        identifiers: [
            '@class',
            'pos',
            'refAA',
        ],
    },
    CytobandPosition: {
        expose: EXPOSE_NONE,
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
        identifiers: [
            '@class',
            'arm',
            'majorBand',
            'minorBand',
        ],
    },
    GenomicPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true, nullable: true, description: 'The genomic/nucleotide number',
        }],
    },
    ExonicPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true, nullable: true, description: 'The exon number',
        }],
    },
    IntronicPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [{
            name: 'pos', type: 'integer', min: 1, mandatory: true, nullable: true,
        }],
    },
    CdsPosition: {
        expose: EXPOSE_NONE,
        inherits: ['Position'],
        embedded: true,
        properties: [
            {
                name: 'pos', type: 'integer', min: 1, mandatory: true, example: 55, nullable: true,
            },
            { name: 'offset', type: 'integer', example: -11 },
        ],
        identifiers: [
            '@class',
            'pos',
            'offset',
        ],
    },
    RnaPosition: {
        expose: EXPOSE_NONE,
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
        identifiers: [
            '@class',
            'pos',
            'offset',
        ],
    },
};
