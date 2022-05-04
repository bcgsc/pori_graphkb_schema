import { schema as SCHEMA_DEFN, ClassModel } from '../src';

describe('SchemaDefinition', () => {
    describe('get', () => {
        test('edge by reverse name', () => {
            expect(SCHEMA_DEFN.get('hasAlias')).toEqual(SCHEMA_DEFN.schema.AliasOf);
        });

        test('vertex by wrong case', () => {
            expect(SCHEMA_DEFN.get('diseasE')).toEqual(SCHEMA_DEFN.schema.Disease);
        });

        test('null for bad class name', () => {
            expect(SCHEMA_DEFN.get('blarghBmojhsgjhs')).toBeNull();
        });
    });

    describe('has', () => {
        test('returns true for valid class', () => {
            expect(SCHEMA_DEFN.has('hasAlias')).toBe(true);
        });

        test('false for missing class', () => {
            expect(SCHEMA_DEFN.has('blarghBmojhsgjhs')).toBe(false);
        });

        test('false for bad object', () => {
            expect(SCHEMA_DEFN.has({ '@class': 1 })).toBe(false);
        });
    });

    describe('getFromRoute', () => {
        test('returns the model for a valid route', () => {
            expect(SCHEMA_DEFN.getFromRoute('/diseases')).toEqual(SCHEMA_DEFN.schema.Disease);
        });

        test('error on a non-existant route', () => {
            expect(() => SCHEMA_DEFN.getFromRoute('/blarghBmojhsgjhs')).toThrowError('Missing model');
        });
    });

    test('getModels', () => {
        const models = SCHEMA_DEFN.getModels();
        expect(Array.isArray(models)).toBe(true);
        expect(models[0]).toBeInstanceOf(ClassModel);
    });

    test('getEdgeModels', () => {
        const models = SCHEMA_DEFN.getEdgeModels();
        expect(Array.isArray(models)).toBe(true);
        expect(models[0]).toBeInstanceOf(ClassModel);
        const names = models.map((m) => m.name);
        expect(names).toContain('E');
        expect(names).not.toContain('V');
    });

    test('splitClassLevels', () => {
        const levels = SCHEMA_DEFN.splitClassLevels()
            .map((level) => level.map((model) => model.name).sort());

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
});

describe('SCHEMA', () => {
    describe('PositionalVariant.formatRecord', () => {
        test('error on missing reference1', () => {
            expect(() => {
                SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference2: '#33:1',
                    break1Start: { '@class': 'ProteinPosition', pos: 1 },
                    type: '#33:2',
                    createdBy: '#44:1',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
            }).toThrowError('missing required attribute');
        });

        test('error on missing break1Start', () => {
            expect(() => {
                SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break2Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                    type: '#33:2',
                    createdBy: '#44:1',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
            }).toThrowError('missing required attribute');
        });

        test('error on position without @class attribute', () => {
            expect(() => {
                SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break1Start: { pos: 1, refAA: 'A' },
                    type: '#33:2',
                    createdBy: '#44:1',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
            }).toThrowError('positions must include the @class attribute');
        });

        test('error on break2End without break2Start', () => {
            expect(() => {
                SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                    type: '#33:2',
                    break2End: { '@class': 'ProteinPosition', pos: 10, refAA: 'B' },
                    createdBy: '#44:1',
                    updatedBy: '#44:1',
                }, { addDefaults: true });
            }).toThrowError('both start and end');
        });

        test('auto generates the breakRepr', () => {
            const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                reference1: '#33:1',
                type: '#33:2',
                createdBy: '#44:1',
                updatedBy: '#44:1',
                break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                break2Start: { '@class': 'ExonicPosition', pos: 1 },
                break2End: { '@class': 'ExonicPosition', pos: 3 },
            }, { addDefaults: true });
            expect(formatted).toHaveProperty('break1Repr', 'p.A1');
            expect(formatted).toHaveProperty('break2Repr', 'e.(1_3)');
        });

        test('generated attr overwrites input if given', () => {
            const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                reference1: '#33:1',
                type: '#33:2',
                createdBy: '#44:1',
                updatedBy: '#44:1',
                break1Start: {
                    '@class': 'ProteinPosition', pos: 1, refAA: 'A', prefix: 'p',
                },
                break1Repr: 'bad',
            }, { addDefaults: true });
            expect(formatted).toHaveProperty('break1Repr', 'p.A1');
        });
    });
    describe('User.email.cast', () => {
        test('Valid email format', () => {
            const propModel = SCHEMA_DEFN.schema.User.properties.email;
            expect(propModel.cast && propModel.cast('user@bcgsc.ca')).toEqual('user@bcgsc.ca');
        });
        test('Invalid email format', () => {
            const propModel = SCHEMA_DEFN.schema.User.properties.email;
            expect(() => (propModel.cast && propModel.cast('user@bcgsc'))).toThrowError();
        });
    });
});
