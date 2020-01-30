const {Property} = require('./../src');


describe('Property', () => {
    it('to throw error on missing name', () => {
        expect(() => { new Property({}); }).toThrowError('name is a required parameter'); // eslint-disable-line
    });
    it('cast choices if given', () => {
        const prop = new Property({name: 'name', choices: ['Stuff', 'OtherStuff', 'morestuff'], cast: x => x.toLowerCase()});
        expect(prop.choices).toEqual(['stuff', 'otherstuff', 'morestuff']);
    });
    describe('validate', () => {
        it('nullable', () => {
            const prop = new Property({
                name: 'example',
                nullable: false
            });
            expect(() => prop.validate(null)).toThrowError('cannot be null');
            expect(prop.validate('')).toBe('');
            expect(prop.validate('blargh')).toBe('blargh');

            const nullableProp = new Property({
                name: 'example',
                nullable: true
            });
            expect(nullableProp.validate(null)).toBeNull();
        });
        it('nonEmpty', () => {
            const prop = new Property({
                name: 'example',
                nonEmpty: false
            });
            expect(prop.validate('')).toBe('');
            expect(prop.validate(null)).toBeNull();
            const prop1 = new Property({
                name: 'example',
                nonEmpty: true
            });
            expect(() => prop1.validate('')).toThrowError('Cannot be an empty string');
            expect(prop1.validate('blargh')).toBe('blargh');
            expect(prop1.validate(null)).toBeNull();

            const prop2 = new Property({
                name: 'example',
                nonEmpty: true,
                cast: x => x
            });
            expect(() => prop2.validate('')).toThrowError('cannot be an empty string');
            expect(prop2.validate(null)).toBeNull();
            expect(prop2.validate('blargh')).toBe('blargh');
        });
        it('min', () => {
            const prop = new Property({
                name: 'example',
                min: -1,
                type: 'integer'
            });
            expect(prop.validate('1')).toBe(1);
            expect(prop.validate(null)).toBeNull();
            expect(() => prop.validate(-2)).toThrowError('Violated the minimum value constraint');
            expect(prop.validate('-1')).toBe(-1);
        });
        it('minItems', () => {
            const prop = new Property({
                name: 'example',
                minItems: 1,
                type: 'embeddedlist'
            });
            expect(prop.validate([1, 2])).toEqual([1, 2]);
            expect(() => prop.validate([])).toThrowError('Less than the required number of elements (0 < 1)');
        });
        it('maxItems', () => {
            const prop = new Property({
                name: 'example',
                maxItems: 0,
                type: 'embeddedlist'
            });
            expect(prop.validate([])).toEqual([]);
            expect(() => prop.validate([1])).toThrowError('More than the allowed number of elements (1 > 0)');
        });
        it('check', () => {
            const prop = new Property({
                name: 'example',
                check: input => input === '1',
                type: 'string'
            });
            expect(prop.validate('1')).toBe('1');
            expect(() => prop.validate('2')).toThrowError('Violated check constraint');
        });
        it('named check', () => {
            const checkIsOne = input => input === '1';
            const prop = new Property({
                name: 'example',
                check: checkIsOne,
                type: 'string'
            });
            expect(prop.validate('1')).toBe('1');
            expect(() => prop.validate('2')).toThrowError('Violated check constraint of example (checkIsOne)');
        });
        it('max', () => {
            const prop = new Property({
                name: 'example',
                max: 10,
                type: 'integer'
            });
            expect(prop.validate('1')).toBe(1);
            expect(prop.validate(null)).toBeNull();
            expect(() => prop.validate('100')).toThrowError('Violated the maximum value constraint');
        });
        it('pattern', () => {
            const stringRegexProp = new Property({
                name: 'example',
                pattern: '^\\d+$'
            });
            expect(stringRegexProp.validate('1')).toBe('1');
            expect(() => stringRegexProp.validate('100d')).toThrowError('Violated the pattern constraint');
            expect(stringRegexProp.validate(null)).toBeNull();

            const regexProp = new Property({
                name: 'example',
                pattern: /^\d+$/
            });
            expect(regexProp.validate('1')).toBe('1');
            expect(() => regexProp.validate('100d')).toThrowError('Violated the pattern constraint');
            expect(regexProp.validate(null)).toBeNull();
        });
        it('choices && !nullable', () => {
            const prop = new Property({
                name: 'example',
                choices: [1, 2, 3],
                cast: Number,
                nullable: false
            });
            expect(prop.validate('1')).toBe(1);
            expect(prop.validate(3)).toBe(3);
            expect(() => prop.validate('100')).toThrowError('Violated the choices constraint');
        });
        it('choices', () => {
            const prop = new Property({
                name: 'example',
                choices: [1, 2, 3],
                cast: Number
            });
            expect(prop.validate('1')).toBe(1);
            expect(prop.validate(null)).toBeNull();
            expect(prop.validate(3)).toBe(3);
            expect(() => prop.validate('100')).toThrowError('Violated the choices constraint');
        });
    });
});
