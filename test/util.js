/**
 * Tests for the utility functions
 */
const {expect} = require('chai');
const {RID} = require('orientjs');

const util = require('./../src/util');

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
});

describe('castToRID', () => {
    it('false for bad RID', () => {
        expect(() => {
            util.castToRID('gkljskjg');
        }).to.throw('not a valid RID');
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
    it('returns null for null', () => {
        expect(util.castNullableLink(null)).to.be.null;
    });
    it('returns RID from string', () => {
        expect(util.castNullableLink('#24:1')).to.eql(new RID('#24:1'));
    });
});

