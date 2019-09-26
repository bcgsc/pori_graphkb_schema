/**
 * Tests for the utility functions
 */
const {expect} = require('chai');

const util = require('./../src/util');

const RID = String;

describe('castUUID', () => {
    it('error on bad uuid', () => {
        expect(() => util.castUUID('ksjgklsh')).to.throw('not a valid version 4 uuid');
    });
    it('returns valid uuid', () => {
        const uuid = '933fd4de-5bd6-471c-9869-a7601294ea6e';
        expect(util.castUUID(uuid)).to.equal(uuid);
    });
    it('errors on close but bad uuid', () => {
        const uuid = '933fd4de-5bd6-471c-4ea6e';
        expect(() => { util.castUUID(uuid); }).to.throw();
    });
});


describe('castString', () => {
    it('lowercases', () => {
        expect(util.castString('Blargh MONKEYS')).to.equal('blargh monkeys');
    });
    it('trims whitespace', () => {
        expect(util.castString('blargh monkeys ')).to.equal('blargh monkeys');
    });
    it('convert int', () => {
        expect(util.castString(1)).to.equal('1');
    });
    it('error on null', () => {
        expect(() => util.castString(null)).to.throw('cannot cast null');
    });
    it('can be empty', () => {
        expect(util.castString('')).to.equal('');
    });
    it('removes line-end characters', () => {
        expect(util.castString('\n\t')).to.equal('');
    });
    it('replaces all space characters with single spaces', () => {
        expect(util.castString('thing\nother thing\tand more things')).to.equal('thing other thing and more things');
    });
});


describe('castNonEmptyString', () => {
    it('cannot be empty', () => {
        expect(() => util.castNonEmptyString('')).to.throw('Cannot be an empty string');
    });
});


describe('castNullableString', () => {
    it('allows null', () => {
        expect(util.castNullableString(null)).to.be.null;
    });
    it('does not convert null', () => {
        expect(util.castNullableString('null')).to.equal('null');
    });
});


describe('looksLikeRID', () => {
    it('false for bad rid', () => {
        expect(util.looksLikeRID('4')).to.be.false;
        expect(util.looksLikeRID('gkljskjg')).to.be.false;
    });
    it('true for rid without hash if not strict', () => {
        expect(util.looksLikeRID('4:0')).to.be.true;
    });
    it('false for rid without hash if strict', () => {
        expect(util.looksLikeRID('4:0', true)).to.be.false;
    });
    it('true for rid with hash if strict', () => {
        expect(util.looksLikeRID('#4:0'), true).to.be.true;
    });
    it('true for rid with hash if not strict', () => {
        expect(util.looksLikeRID('#4:0')).to.be.true;
    });
    it('requirehash error on no hash', () => {
        expect(util.looksLikeRID('3:1', true)).to.be.false;
    });
    it('allows negative numbers', () => {
        expect(util.looksLikeRID('#4:-0')).to.be.true;
        expect(util.looksLikeRID('#-4:-0')).to.be.true;
        expect(util.looksLikeRID('#-4:0')).to.be.true;
    });
    it('enforces max cluster value', () => {
        expect(util.looksLikeRID('#32767:-0')).to.be.true;
        expect(util.looksLikeRID('#32768:-0')).to.be.false;
    });
});

describe('displayOntology', () => {
    it('uses sourceId when name = sourceId', () => {
        expect(util.displayOntology({name: 'p1', sourceId: 'p1'})).to.equal('p1');
    });
    it('uses both sourceId and name by default', () => {
        expect(util.displayOntology({name: 'cancer', sourceId: 'doid:1234'})).to.equal('cancer [DOID:1234]');
    });
    it('uses name if no sourceId', () => {
        expect(util.displayOntology({name: 'cancer'})).to.equal('cancer');
    });
    it('uses source if given with sourceId number', () => {
        expect(util.displayOntology({sourceId: '1234', source: {displayName: 'pmid'}})).to.equal('pmid:1234');
    });
});

describe('displayFeature', () => {
    it('use name for hugo ID', () => {
        expect(util.displayFeature({name: 'symbol', sourceId: 'hgnc:1234'})).to.equal('SYMBOL');
    });
    it('use sourceIdVersion if given in number format', () => {
        expect(util.displayFeature({sourceId: 'K1234', sourceIdVersion: '1'})).to.equal('K1234.1');
        expect(util.displayFeature({sourceId: 'K1234', sourceIdVersion: 'm1'})).to.equal('K1234');
    });
    it('uses name if no sourceId', () => {
        expect(util.displayFeature({name: 'cancer'})).to.equal('cancer');
    });
    it('uses name if sourceId is number format', () => {
        expect(util.displayFeature({name: 'kras', sourceId: '1234'})).to.equal('kras');
        expect(util.displayFeature({name: 'kras', sourceId: 'm1234'})).to.not.equal('KRAS');
    });
});

describe('castToRID', () => {
    it('false for bad RID', () => {
        expect(() => {
            util.castToRID('gkljskjg');
        }).to.throw('not a valid RID (gkljskjg)');
    });
    it('returns nested RID', () => {
        expect(util.castToRID({'@rid': '#24:1'})).to.eql(new RID('#24:1'));
    });
    it('error on null', () => {
        expect(() => {
            util.castToRID(null);
        }).to.throw('cannot cast null');
    });
    it('dose nothing if already RID', () => {
        const rid = new RID('#24:1');
        expect(util.castToRID(rid)).to.equal(rid);
    });
    it('fails for too large of cluster id', () => {
        expect(() => util.castToRID('#327278:1')).to.throw('not a valid RID');
    });
});


describe('castString', () => {
    it('error on null', () => {
        expect(() => { util.castString(null); }).to.throw('cannot cast null');
    });
});


describe('castNullableString', () => {
    it('null for null', () => {
        expect(util.castNullableString(null)).to.be.null;
    });
});


describe('castNonEmptyNullableString', () => {
    it('null for null', () => {
        expect(util.castNonEmptyNullableString(null)).to.be.null;
    });
});


describe('castNullableLink', () => {
    it('returns null for null string', () => {
        expect(util.castNullableLink('null')).to.be.null;
    });
    it('returns null fo null', () => {
        expect(util.castNullableLink(null)).to.be.null;
    });
    it('returns RID from string', () => {
        expect(util.castNullableLink('#24:1')).to.eql(new RID('#24:1'));
    });
});
