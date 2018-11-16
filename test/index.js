const {expect} = require('chai');
const {types} = require('orientjs');

const SCHEMA_DEFN = require('./../src/schema');


const OJS_TYPES = {};
for (const num of Object.keys(types)) {
    const name = types[num].toLowerCase();
    OJS_TYPES[name] = num;
}


describe('SCHEMA', () => {
    describe('PositionalVariant.formatRecord', () => {
        it('error on missing reference1', () => {
            expect(() => {
                SCHEMA_DEFN.PositionalVariant.formatRecord({
                    reference2: '#33:1',
                    break1Start: {'@class': 'ProteinPosition', pos: 1},
                    type: '#33:2',
                    createdBy: '#44:1'
                }, {addDefaults: true});
            }).to.throw('missing required attribute');
        });
        it('error on missing break1Start', () => {
            expect(() => {
                const formatted = SCHEMA_DEFN.PositionalVariant.formatRecord({
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
                const formatted = SCHEMA_DEFN.PositionalVariant.formatRecord({
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
                const formatted = SCHEMA_DEFN.PositionalVariant.formatRecord({
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
            const formatted = SCHEMA_DEFN.PositionalVariant.formatRecord({
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
        it('ignores the input breakrepr if given', () => {
            const formatted = SCHEMA_DEFN.PositionalVariant.formatRecord({
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
        it('applied defaultPreview to ClassModels with no defined getPreview', () => {
            const {V} = SCHEMA_DEFN;
            const test1 = {'@rid': '#1'};
            const test2 = {'@class': 'blargh'};
            expect(V.getPreview(test1)).to.eql('#1');
            expect(V.getPreview(test2)).to.eql('Invalid Record');
        });
        it('inherits identifiers', () => {
            const {Disease, Ontology} = SCHEMA_DEFN;
            expect(Disease.identifiers).to.eql(Ontology.identifiers);
        });
    });

    describe('special previews', () => {
        it('source', () => {
            const test = {name: 'hello', monkey: 'madness'};
            expect(SCHEMA_DEFN.Source.getPreview(test)).to.eql('hello');
        });
        it('ontology', () => {
            const test = {test: 'no', name: 'yes'};
            expect(SCHEMA_DEFN.Ontology.getPreview(test)).to.eql('yes');
        });
        it('publication', () => {
            const test = {source: {name: 'source'}, sourceId: '1234'};
            expect(SCHEMA_DEFN.Publication.getPreview(test)).to.eql('source: 1234');
        });
        it('positionalVariant', () => {
            const test = {
                type: 'deletion',
                reference1: {
                    '@class': 'Feature',
                    sourceId: 'kras',
                    biotype: 'gene'
                },
                break1Start: {
                    '@class': 'ProteinPosition',
                    pos: 14,
                    refAA: 'A'
                }
            };
            expect(SCHEMA_DEFN.PositionalVariant.getPreview(test)).to.eql('KRAS:p.A14del');
        });
        it('categoryVariant', () => {
            const test = {
                type: {
                    '@class': 'Vocabulary',
                    name: 'fusion'
                },
                reference1: {
                    '@class': 'Feature',
                    name: 'brca1',
                    biotype: 'gene'
                },
                reference2: {
                    '@class': 'Feature',
                    name: 'brca2',
                    biotype: 'gene'
                },
                anotherProp: 'ignored'
            };
            expect(SCHEMA_DEFN.CategoryVariant.getPreview(test)).to.eql('fusion variant on gene brca1 and gene brca2');
        });
        it('statement', () => {
            const test = {
                relevance: {
                    '@class': 'Vocabulary',
                    name: 'resistance'
                },
                appliesTo: {
                    '@class': 'Feature',
                    sourceId: 'a1bg',
                    biotype: 'gene'
                },
                source: {
                    '@class': 'Source',
                    this: 'is ignored'
                }
            };
            expect(SCHEMA_DEFN.Statement.getPreview(test)).to.eql('resistance to a1bg');
        });
    });
});
