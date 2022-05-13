import { schema } from '../src';
import examples from './testData/statementExamples.json';


test.each([
    ['E', 'AliasOf'],
    ['Ontology', 'EvidenceLevel'],
    ['Ontology', 'Publication'],
    ['Publication', 'Abstract'],
    ['V', 'Source'],
    ['V', 'Ontology'],
])('%s has child %s', (parent, child) => {
    expect(schema.children(parent)).toContain(child);
});

test.each([
    ['V', []],
    ['Ontology', ['V', 'Biomarker']],
    ['AliasOf', ['E']],
    ['EvidenceLevel', ['Evidence', 'Ontology', 'V', 'Biomarker']],
    ['PositionalVariant', ['Variant', 'Biomarker', 'V']]
])('ancestors', (child, parents) => {
    expect(schema.ancestors(child).sort()).toEqual(parents.sort());
});

describe('descendants', () => {
    test.each(
        ['V', 'Ontology', 'E', 'Variant']
    )('includeSelf', (modelName) => {
        expect(schema.descendants(modelName, { includeSelf: true })).toContain(modelName);
        expect(schema.descendants(modelName, { includeSelf: false })).not.toContain(modelName);
    });
});

describe('formatRecord', () => {
    const userArgs = { updatedBy: '#4:3', createdBy: '#4:3' };
    test.each([
        [
            'PositionalVariant',
            'break1Repr',
            'p.A1',
            {
                reference1: '#33:1',
                type: '#33:2',
                createdBy: '#44:1',
                updatedBy: '#44:1',
                break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                break2Start: { '@class': 'ExonicPosition', pos: 1 },
                break2End: { '@class': 'ExonicPosition', pos: 3 },
            }
        ],
        [
            'PositionalVariant',
            'break2Repr',
            'e.(1_3)',
            {
                reference1: '#33:1',
                type: '#33:2',
                createdBy: '#44:1',
                updatedBy: '#44:1',
                break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                break2Start: { '@class': 'ExonicPosition', pos: 1 },
                break2End: { '@class': 'ExonicPosition', pos: 3 },
            }
        ],
    ])('%s adds/generates default %s', (model, defaultProp, defaultPropValue, record) => {
        const formatted = schema.formatRecord(model, record, { addDefaults: true });
        expect(formatted).toHaveProperty(defaultProp, defaultPropValue);
    });

    describe('PositionalVariant.formatRecord', () => {
        test('error on missing reference1', () => {
            expect(() => {
                schema.formatRecord('PositionalVariant', {
                    break1Start: { '@class': 'ProteinPosition', pos: 1 },
                    createdBy: '#44:1',
                    reference2: '#33:1',
                    type: '#33:2',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
            }).toThrow('missing required attribute');
        });

        test('error on missing break1Start', () => {
            expect(() => {
                const formatted = schema.formatRecord('PositionalVariant', {
                    break2Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                    createdBy: '#44:1',
                    reference1: '#33:1',
                    type: '#33:2',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
                console.error(formatted);
            }).toThrow('missing required attribute');
        });

        test('error on position without @class attribute', () => {
            expect(() => {
                const formatted = schema.formatRecord('PositionalVariant', {
                    break1Start: { pos: 1, refAA: 'A' },
                    createdBy: '#44:1',
                    reference1: '#33:1',
                    type: '#33:2',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
                console.error(formatted);
            }).toThrow('positions must include the @class attribute');
        });

        test('error on break2End without break2Start', () => {
            expect(() => {
                const formatted = schema.formatRecord('PositionalVariant', {
                    break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                    break2End: { '@class': 'ProteinPosition', pos: 10, refAA: 'B' },
                    createdBy: '#44:1',
                    reference1: '#33:1',
                    type: '#33:2',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
                console.error(formatted);
            }).toThrow('both start and end');
        });

        test('auto generates the breakRepr', () => {
            const formatted = schema.formatRecord('PositionalVariant', {
                break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                break2End: { '@class': 'ExonicPosition', pos: 3 },
                break2Start: { '@class': 'ExonicPosition', pos: 1 },
                createdBy: '#44:1',
                reference1: '#33:1',
                type: '#33:2',
                updatedBy: '#44:1',
            }, { addDefaults: true });
            expect(formatted).toHaveProperty('break1Repr', 'p.A1');
            expect(formatted).toHaveProperty('break2Repr', 'e.(1_3)');
        });

        test('ignores the input breakrepr if given', () => {
            const formatted = schema.formatRecord('PositionalVariant', {
                break1Repr: 'bad',
                break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                createdBy: '#44:1',
                reference1: '#33:1',
                type: '#33:2',
                updatedBy: '#44:1',
            }, { addDefaults: true });
            expect(formatted).toHaveProperty('break1Repr', 'p.A1');
        });
    });

    test.each([
        ['SubClassOf', 'out', { in: '#3:1' }],
        ['AliasOf', 'in', { out: '#3:1' }],
        ['Ontology', 'source', { sourceId: 1, subsets: ['BLARGH', 'MonKEYS'], ...userArgs }],
    ])('error %s record missing required property \'%s\'', (modelName, property, record) => {
        expect(() => schema.formatRecord(modelName, record)).toThrow(property);
    });

    test.each([
        ['SubClassOf', 'blargh', { in: '#3:1', out: '#4:3', 'blargh': 2 }],
    ])('error on unexpected property %s.%s', (modelName, property, record) => {
        expect(() => schema.formatRecord(modelName, record, { ignoreExtra: false, dropExtra: false })).toThrow(property);
    });

    test.each([
        ['SubClassOf', 'out', { in: '#3:1' }],
        ['AliasOf', 'in', { out: '#3:1' }],
        ['Ontology', 'source', { sourceId: 1, subsets: ['BLARGH', 'MonKEYS'] }],
    ])('ignore missing required property %s.%s', (modelName, property, record) => {
        expect(() => schema.formatRecord(modelName, record, { ignoreMissing: true })).not.toThrow(property);
    });

    test.each([
        ['Ontology', 'subsets', { sourceId: 1, subsets: ['BLARGH', 'MonKEYS'], source: '#4:3', ...userArgs }, ['blargh', 'monkeys']],
        ['User', 'email', { name: 'blargh', email: 'blargh@monkeys.ca', ...userArgs }, 'blargh@monkeys.ca'],
    ])('%s casts property \'%s\'', (modelName, property, record, castValue) => {
        expect(schema.formatRecord(modelName, record)).toHaveProperty(property, castValue);
    });

    test.each([
        ['User', 'email', { name: 'blargh', email: 'BAD EMAIL' }],
    ])('%s throws error on casting property \'%\'', (modelName, property, record) => {
        expect(() => schema.formatRecord(modelName, record)).toThrow(property);
    });
});

describe('has', () => {
    test.each(['V', 'Ontology', 'E', 'AliasOf'])('%s', (modelName) => {
        expect(schema.has(modelName)).toBe(true);
    });

    test.each(['blargh', 'Monkeys'])('%s', (modelName) => {
        expect(schema.has(modelName)).toBe(false);
    });
});


describe('get', () => {
    test.each(['blargh', 'Monkeys'])('%s', (modelName) => {
        expect(() => schema.get(modelName, true)).toThrow(`Unable to retrieve model: ${modelName.toLowerCase()}`);
        expect(schema.get(modelName, false)).toBe(null);
    });
});


describe('getFromRoute', () => {
    test.each([
        ['V', '/v'],
        ['EvidenceLevel', '/evidencelevels'],
        ['Therapy', '/therapies'],
        ['Vocabulary', '/vocabulary']
    ])('%s has route %s', (model, route) => {
        expect(schema.getFromRoute(route)).toHaveProperty('name', model);
    });

    test('error on missing route', () => {
        expect(() => schema.getFromRoute('/blargh-monkeys')).toThrow('Missing model')
    });
});

test.each([
    'V', 'E', 'Ontology', 'Publication', 'Variant'
])('getModels includes %s', (model) => {
    expect(schema.getModels().map(m => m.name)).toContain(model);
});

describe('getEdgeModels', () => {
    test.each([
        'E', 'SubClassOf'
    ])('includes %s', (model) => {
        expect(schema.getEdgeModels().map(m => m.name)).toContain(model);
    });

    test.each([
        'V', 'Ontology', 'Publication', 'Variant'
    ])('does not include %s', (model) => {
        expect(schema.getEdgeModels().map(m => m.name)).not.toContain(model);
    });
});

test('splitClassLevels', () => {
    const levels = schema.splitClassLevels()
        .map((level) => level.sort());

    expect(levels).toEqual([
        [
            'E',
            'User',
            'UserGroup',
            'V',
        ],
        [
            'Biomarker',
            'Evidence',
            'LicenseAgreement',
            'Permissions',
            'Position',
            'StatementReview',
        ],
        [
            'CdsPosition',
            'CytobandPosition',
            'ExonicPosition',
            'GenomicPosition',
            'IntronicPosition',
            'NonCdsPosition',
            'ProteinPosition',
            'RnaPosition',
            'Source',
        ],
        ['Ontology'],
        [
            'AliasOf',
            'AnatomicalEntity',
            'CatalogueVariant',
            'Cites',
            'ClinicalTrial',
            'CrossReferenceOf',
            'CuratedContent',
            'DeprecatedBy',
            'Disease',
            'ElementOf',
            'EvidenceLevel',
            'Feature',
            'GeneralizationOf',
            'OppositeOf',
            'Pathway',
            'Publication',
            'Signature',
            'SubClassOf',
            'TargetOf',
            'Therapy',
            'Vocabulary',
        ],
        ['Abstract', 'Statement', 'Variant'],
        ['CategoryVariant', 'Infers', 'PositionalVariant'],
    ]);
});


test.each([
    ['Ontology', 'sourceId'],
    ['Source', 'name']
])('requiredProperties', (modelName, property) => {
    expect(schema.requiredProperties(modelName)).toContain(property);
    expect(schema.optionalProperties(modelName)).not.toContain(property);
});

test.each([
    ['Ontology', 'comment'],
    ['Source', 'description']
])('optionalProperties', (modelName, property) => {
    expect(schema.requiredProperties(modelName)).not.toContain(property);
    expect(schema.optionalProperties(modelName)).toContain(property);
});

test.each([
    ['V', null],
    ['Source', 'name'],
    ['Ontology', 'sourceId'],
    ['Ontology', 'name']
])('activeProperties', (modelName, activeProperty) => {
    if (activeProperty !== null) {
        expect(schema.activeProperties(modelName)).toContain(activeProperty);
    } else {
        expect(schema.activeProperties(modelName)).toBe(null);
    }
});

describe('inheritsProperty', () => {
    test.each([
        ['Source', 'uuid'],
        ['Publication', 'sourceId'],
        ['PositionalVariant', 'uuid']
    ])('%s inherits %s', (model, property) => {
        expect(schema.inheritsProperty(model, property)).toBe(true);
    });

    test.each([
        ['Source', 'name'],
        ['Ontology', 'sourceId'],
        ['Ontology', 'name']
    ])('%s does not inherit %s', (model, property) => {
        expect(schema.inheritsProperty(model, property)).toBe(false);
    });
});

describe('queryableProperties', () => {
    test.each([
        ['Source', 'uuid'],
        ['V', 'name'],
        ['V', 'licenseType'],
        ['Publication', 'sourceId'],
        ['PositionalVariant', 'uuid']
    ])('%s can query %s', (model, property) => {
        expect(schema.queryableProperties(model)).toHaveProperty(property);
    });

    test.each([
        ['Ontology', 'licenseType'],
        ['User', 'reference1'],
    ])('%s cannot query %s', (model, property) => {
        expect(schema.queryableProperties(model)).not.toHaveProperty(property);
    });
});

test.each([
    ['blargh', { displayName: 'blargh', name: 'monkeys' }],
    ['blargh', { name: 'blargh' }],
    ['DNMT3A:p.R882 predicts unfavourable prognosis in acute myeloid leukemia [DOID:9119] ({evidence})', { ...examples['subject:null|conditions:Disease;PositionalVariant|relevance:unfavourable prognosis'], '@class': 'Statement' }],
    ['#3:4', { '@rid': '#3:4' }],
    ['3', [1, 2, 3]],
    ['blargh', { target: { name: 'blargh' } }],
    ['blargh', 'blargh'],
    [
        'User',
        {
            '@rid': '20:0',
            '@class': 'User',
            createdBy: 'Mom',
            deletedBy: 'Mom',
        },
      ],
      [
        '22:0',
        {
            '@rid': '22:0',
        },
      ],
      [
        'Disease',
        {
            '@class': 'Disease',
        },
      ],
      [
        'Given Low blood sugar Mood Swings applies to hungertitis (A reputable source)',
        {
            displayName: 'displayName',
            '@class': 'Statement',
            '@rid': '22:0',
            displayNameTemplate: 'Given {conditions} {relevance} applies to {subject} ({evidence})',
            relevance: { displayName: 'Mood Swings', '@rid': '1:2' },
            conditions: [{ displayName: 'Low blood sugar', '@rid': '1:3'  }],
            subject: { displayName: 'hungertitis', '@rid': '1:4'  },
            evidence: [{ displayName: 'A reputable source', '@rid': '1:5'  }],
        },
      ],
      [
        '#19:0', '#19:0',
      ],
])('getPreview %s', (preview, input) => {
    // @ts-ignore  testing bad input in some cases
    expect(schema.getPreview(input)).toEqual(preview);
});


test.each([
    ['V', { default: 4, readonly: 4 }],
    ['Evidence', { default: 4, readonly: 4 }],
    ['Biomarker', { default: 4, readonly: 4 }],
    [
        'Source',
        { default: 4, readonly: 4, admin: 15, regular: 14, manager: 14 }
    ],
    [
        'LicenseAgreement',
        { default: 4, readonly: 4, admin: 15, regular: 4, manager: 4 }
    ],
    ['E', { default: 4, readonly: 4 }],
    ['AliasOf', { default: 13, readonly: 4 }],
    ['Cites', { default: 13, readonly: 4 }],
    ['CrossReferenceOf', { default: 13, readonly: 4 }],
    ['DeprecatedBy', { default: 13, readonly: 4 }],
    ['ElementOf', { default: 13, readonly: 4 }],
    ['GeneralizationOf', { default: 13, readonly: 4 }],
    ['Infers', { default: 13, readonly: 4 }],
    ['SubClassOf', { default: 13, readonly: 4 }],
    ['TargetOf', { default: 13, readonly: 4 }],
    ['OppositeOf', { default: 13, readonly: 4 }],
    ['Position', { default: 0, readonly: 4 }],
    ['ProteinPosition', { default: 0, readonly: 4 }],
    ['CytobandPosition', { default: 0, readonly: 4 }],
    ['GenomicPosition', { default: 0, readonly: 4 }],
    ['ExonicPosition', { default: 0, readonly: 4 }],
    ['IntronicPosition', { default: 0, readonly: 4 }],
    ['CdsPosition', { default: 0, readonly: 4 }],
    ['NonCdsPosition', { default: 0, readonly: 4 }],
    ['RnaPosition', { default: 0, readonly: 4 }],
    ['StatementReview', { default: 0, readonly: 4 }],
    ['Statement', { default: 15, readonly: 4 }],
    ['Variant', { default: 4, readonly: 4 }],
    ['PositionalVariant', { default: 15, readonly: 4 }],
    ['CategoryVariant', { default: 15, readonly: 4 }],
    ['CatalogueVariant', { default: 15, readonly: 4 }],
    ['User', { default: 4, readonly: 4, admin: 15 }],
    ['UserGroup', { default: 4, readonly: 4, admin: 15 }],
    ['Permissions', { default: 0, readonly: 4 }],
    ['Ontology', { default: 4, readonly: 4 }],
    ['EvidenceLevel', { default: 15, readonly: 4 }],
    ['ClinicalTrial', { default: 15, readonly: 4 }],
    ['Abstract', { default: 15, readonly: 4 }],
    ['Publication', { default: 15, readonly: 4 }],
    ['CuratedContent', { default: 15, readonly: 4 }],
    ['Therapy', { default: 15, readonly: 4 }],
    ['Feature', { default: 15, readonly: 4 }],
    ['AnatomicalEntity', { default: 15, readonly: 4 }],
    ['Disease', { default: 15, readonly: 4 }],
    ['Pathway', { default: 15, readonly: 4 }],
    ['Signature', { default: 15, readonly: 4 }],
    ['Vocabulary', { default: 4, readonly: 4, admin: 15, manager: 15 }]
])('%s permissions', (modelName, permissions) => {
    // permissions copied from prod to check stable with new changes
    const model = schema.get(modelName);
    expect(model.permissions).toEqual(expect.objectContaining(permissions));
});
