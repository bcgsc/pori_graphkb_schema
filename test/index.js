const {expect} = require('chai');

const {schema: SCHEMA_DEFN} = require('./../src');


describe('SchemaDefinition', () => {
    describe('get class model', () => {
        it('edge by reverse name', () => {
            expect(SCHEMA_DEFN.get('hasAlias')).to.eql(SCHEMA_DEFN.schema.AliasOf);
        });
        it('vertex by wrong case', () => {
            expect(SCHEMA_DEFN.get('diseasE')).to.eql(SCHEMA_DEFN.schema.Disease);
        });
        it('null for bad class name', () => {
            expect(SCHEMA_DEFN.get('blarghBmojhsgjhs')).to.be.null;
        });
    });
    describe('has class model', () => {
        it('returns true for valid class', () => {
            expect(SCHEMA_DEFN.has('hasAlias')).to.be.true;
        });
        it('false for missing class', () => {
            expect(SCHEMA_DEFN.has('blarghBmojhsgjhs')).to.be.false;
        });
    });
    describe('fetch by routeName', () => {
        it('returns the model for a valid route', () => {
            expect(SCHEMA_DEFN.getFromRoute('/diseases')).to.eql(SCHEMA_DEFN.schema.Disease);
        });
        it('error on a non-existant route', () => {
            expect(() => SCHEMA_DEFN.getFromRoute('/blarghBmojhsgjhs')).to.throw('Missing model');
        });
    });
});
describe('SCHEMA', () => {
    describe('PositionalVariant.formatRecord', () => {
        it('error on missing reference1', () => {
            expect(() => {
                SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference2: '#33:1',
                    break1Start: {'@class': 'ProteinPosition', pos: 1},
                    type: '#33:2',
                    createdBy: '#44:1'
                }, {addDefaults: true});
            }).to.throw('missing required attribute');
        });
        it('error on missing break1Start', () => {
            expect(() => {
                const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break2Start: {'@class': 'ProteinPosition', pos: 1, refAA: 'A'},
                    type: '#33:2',
                    createdBy: '#44:1'
                }, {addDefaults: true});
                console.log(formatted);
            }).to.throw('missing required attribute');
        });
        it('error on position without @class attribute', () => {
            expect(() => {
                const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break1Start: {pos: 1, refAA: 'A'},
                    type: '#33:2',
                    createdBy: '#44:1'
                }, {addDefaults: true});
                console.log(formatted);
            }).to.throw('positions must include the @class attribute');
        });
        it('error on break2End without break2Start', () => {
            expect(() => {
                const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                    reference1: '#33:1',
                    break1Start: {'@class': 'ProteinPosition', pos: 1, refAA: 'A'},
                    type: '#33:2',
                    break2End: {'@class': 'ProteinPosition', pos: 10, refAA: 'B'},
                    createdBy: '#44:1'
                }, {addDefaults: true});
                console.log(formatted);
            }).to.throw('both start and end');
        });
        it('auto generates the breakRepr', () => {
            const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                reference1: '#33:1',
                type: '#33:2',
                createdBy: '#44:1',
                break1Start: {'@class': 'ProteinPosition', pos: 1, refAA: 'A'},
                break2Start: {'@class': 'ExonicPosition', pos: 1},
                break2End: {'@class': 'ExonicPosition', pos: 3}
            }, {addDefaults: true});
            expect(formatted).to.have.property('break1Repr', 'p.A1');
            expect(formatted).to.have.property('break2Repr', 'e.(1_3)');
        });
        it('generated attr overwrites input if given', () => {
            const formatted = SCHEMA_DEFN.schema.PositionalVariant.formatRecord({
                reference1: '#33:1',
                type: '#33:2',
                createdBy: '#44:1',
                break1Start: {'@class': 'ProteinPosition', pos: 1, refAA: 'A'},
                break1Repr: 'bad'
            }, {addDefaults: true});
            expect(formatted).to.have.property('break1Repr', 'p.A1');
        });
    });

    describe('previews and identifiers', () => {
        it('inherits identifiers', () => {
            const {Disease, Ontology} = SCHEMA_DEFN.schema;
            expect(Disease.identifiers).to.eql(Ontology.identifiers);
        });
    });
});
