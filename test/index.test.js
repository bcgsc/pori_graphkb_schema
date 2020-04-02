const { schema: SCHEMA_DEFN } = require('./../src');


describe('SchemaDefinition', () => {
    describe('get class model', () => {
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
    describe('has class model', () => {
        test('returns true for valid class', () => {
            expect(SCHEMA_DEFN.has('hasAlias')).toBe(true);
        });
        test('false for missing class', () => {
            expect(SCHEMA_DEFN.has('blarghBmojhsgjhs')).toBe(false);
        });
    });
    describe('fetch by routeName', () => {
        test('returns the model for a valid route', () => {
            expect(SCHEMA_DEFN.getFromRoute('/diseases')).toEqual(SCHEMA_DEFN.schema.Disease);
        });
        test('error on a non-existant route', () => {
            expect(() => SCHEMA_DEFN.getFromRoute('/blarghBmojhsgjhs')).toThrowError('Missing model');
        });
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
                }, { addDefaults: true });
            }).toThrowError('missing required attribute');
        });
        test('error on missing break1Start', () => {
            expect(() => {
                const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break2Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                    type: '#33:2',
                    createdBy: '#44:1',
                }, { addDefaults: true });
                console.log(formatted);
            }).toThrowError('missing required attribute');
        });
        test('error on position without @class attribute', () => {
            expect(() => {
                const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break1Start: { pos: 1, refAA: 'A' },
                    type: '#33:2',
                    createdBy: '#44:1',
                }, { addDefaults: true });
                console.log(formatted);
            }).toThrowError('positions must include the @class attribute');
        });
        test('error on break2End without break2Start', () => {
            expect(() => {
                const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                    type: '#33:2',
                    break2End: { '@class': 'ProteinPosition', pos: 10, refAA: 'B' },
                    createdBy: '#44:1',
                }, { addDefaults: true });
                console.log(formatted);
            }).toThrowError('both start and end');
        });
        test('auto generates the breakRepr', () => {
            const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                reference1: '#33:1',
                type: '#33:2',
                createdBy: '#44:1',
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
                break1Start: { '@class': 'ProteinPosition', pos: 1, refAA: 'A' },
                break1Repr: 'bad',
            }, { addDefaults: true });
            expect(formatted).toHaveProperty('break1Repr', 'p.A1');
        });
    });

    describe('previews and identifiers', () => {
        test('inherits identifiers', () => {
            const { Disease, Ontology } = SCHEMA_DEFN.schema;
            expect(Disease.identifiers).toEqual(Ontology.identifiers);
        });
    });
});
