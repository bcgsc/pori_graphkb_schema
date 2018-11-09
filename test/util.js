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
});


describe('looksLikeRID', () => {
    it('false for bad RID', () => {
        expect(util.looksLikeRID('gkljskjg')).to.be.false;
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
