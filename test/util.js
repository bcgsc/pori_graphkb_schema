/**
 * Tests for the utility functions
 */
const util = require('./../src/util');

const RID = String;

describe('castUUID', () => {
    it('error on bad uuid', () => {
        expect(() => util.castUUID('ksjgklsh')).toThrowError('not a valid version 4 uuid');
    });
    it('returns valid uuid', () => {
        const uuid = '933fd4de-5bd6-471c-9869-a7601294ea6e';
        expect(util.castUUID(uuid)).toBe(uuid);
    });
    it('errors on close but bad uuid', () => {
        const uuid = '933fd4de-5bd6-471c-4ea6e';
        expect(() => { util.castUUID(uuid); }).toThrowError();
    });
});


describe('castLowercaseString', () => {
    it('lowercases', () => {
        expect(util.castLowercaseString('Blargh MONKEYS')).toBe('blargh monkeys');
    });
    it('trims whitespace', () => {
        expect(util.castLowercaseString('blargh monkeys ')).toBe('blargh monkeys');
    });
    it('convert int', () => {
        expect(util.castLowercaseString(1)).toBe('1');
    });
    it('error on null', () => {
        expect(() => util.castLowercaseString(null)).toThrowError('cannot cast null');
    });
    it('can be empty', () => {
        expect(util.castLowercaseString('')).toBe('');
    });
    it('removes line-end characters', () => {
        expect(util.castLowercaseString('\n\t')).toBe('');
    });
    it('replaces all space characters with single spaces', () => {
        expect(util.castLowercaseString('thing\nother thing\tand more things')).toBe('thing other thing and more things');
    });
});


describe('castNonEmptyString', () => {
    it('cannot be empty', () => {
        expect(() => util.castNonEmptyString('')).toThrowError('Cannot be an empty string');
    });
});


describe('castNullableString', () => {
    it('allows null', () => {
        expect(util.castNullableString(null)).toBeNull();
    });
    it('does not convert null', () => {
        expect(util.castNullableString('null')).toBe('null');
    });
});


describe('looksLikeRID', () => {
    it('false for bad rid', () => {
        expect(util.looksLikeRID('4')).toBe(false);
        expect(util.looksLikeRID('gkljskjg')).toBe(false);
    });
    it('true for rid without hash if not strict', () => {
        expect(util.looksLikeRID('4:0')).toBe(true);
    });
    it('false for rid without hash if strict', () => {
        expect(util.looksLikeRID('4:0', true)).toBe(false);
    });
    it('true for rid with hash if strict', () => {
        // true
        expect(util.looksLikeRID('#4:0')).toBe(true);
    });
    it('true for rid with hash if not strict', () => {
        expect(util.looksLikeRID('#4:0')).toBe(true);
    });
    it('requirehash error on no hash', () => {
        expect(util.looksLikeRID('3:1', true)).toBe(false);
    });
    it('allows negative numbers', () => {
        expect(util.looksLikeRID('#4:-0')).toBe(true);
        expect(util.looksLikeRID('#-4:-0')).toBe(true);
        expect(util.looksLikeRID('#-4:0')).toBe(true);
    });
    it('enforces max cluster value', () => {
        expect(util.looksLikeRID('#32767:-0')).toBe(true);
        expect(util.looksLikeRID('#32768:-0')).toBe(false);
    });
});

describe('displayOntology', () => {
    it('uses sourceId when name = sourceId', () => {
        expect(util.displayOntology({name: 'p1', sourceId: 'p1'})).toBe('p1');
    });
    it('uses both sourceId and name by default', () => {
        expect(util.displayOntology({name: 'cancer', sourceId: 'doid:1234'})).toBe('cancer [DOID:1234]');
    });
    it('uses name if no sourceId', () => {
        expect(util.displayOntology({name: 'cancer'})).toBe('cancer');
    });
    it('uses source if given with sourceId number', () => {
        expect(util.displayOntology({sourceId: '1234', source: {displayName: 'pmid'}})).toBe('pmid:1234');
    });
});

describe('displayFeature', () => {
    it('use name for hugo ID', () => {
        expect(util.displayFeature({name: 'symbol', sourceId: 'hgnc:1234'})).toBe('SYMBOL');
    });
    it('use sourceIdVersion if given in number format', () => {
        expect(util.displayFeature({sourceId: 'K1234', sourceIdVersion: '1'})).toBe('K1234.1');
        expect(util.displayFeature({sourceId: 'K1234', sourceIdVersion: 'm1'})).toBe('K1234');
    });
    it('uses name if no sourceId', () => {
        expect(util.displayFeature({name: 'cancer'})).toBe('cancer');
    });
    it('uses name if sourceId is number format', () => {
        expect(util.displayFeature({name: 'kras', sourceId: '1234'})).toBe('kras');
        expect(util.displayFeature({name: 'kras', sourceId: 'm1234'})).not.toBe('KRAS');
    });
});

describe('castToRID', () => {
    it('false for bad RID', () => {
        expect(() => {
            util.castToRID('gkljskjg');
        }).toThrowError('not a valid RID (gkljskjg)');
    });
    it('returns nested RID', () => {
        expect(util.castToRID({'@rid': '#24:1'})).toEqual(new RID('#24:1'));
    });
    it('error on null', () => {
        expect(() => {
            util.castToRID(null);
        }).toThrowError('cannot cast null');
    });
    it('dose nothing if already RID', () => {
        const rid = new RID('#24:1');
        expect(util.castToRID(rid)).toBe(rid);
    });
    it('fails for too large of cluster id', () => {
        expect(() => util.castToRID('#327278:1')).toThrowError('not a valid RID');
    });
});


describe('castLowercaseString', () => {
    it('error on null', () => {
        expect(() => { util.castLowercaseString(null); }).toThrowError('cannot cast null');
    });
});


describe('castNullableString', () => {
    it('null for null', () => {
        expect(util.castNullableString(null)).toBeNull();
    });
});


describe('castNonEmptyNullableString', () => {
    it('null for null', () => {
        expect(util.castNonEmptyNullableString(null)).toBeNull();
    });
});


describe('castNullableLink', () => {
    it('returns null for null string', () => {
        expect(util.castNullableLink('null')).toBeNull();
    });
    it('returns null fo null', () => {
        expect(util.castNullableLink(null)).toBeNull();
    });
    it('returns RID from string', () => {
        expect(util.castNullableLink('#24:1')).toEqual(new RID('#24:1'));
    });
});
