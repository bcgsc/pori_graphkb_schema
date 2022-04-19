import { validateProperty, createPropertyDefinition } from '../src/property';

test('cast choices if given', () => {
    const prop = createPropertyDefinition({
        name: 'name',
        choices: ['Stuff', 'OtherStuff', 'morestuff'],
        cast: (x) => x.toLowerCase()
    });
    expect(prop.choices).toEqual(['stuff', 'otherstuff', 'morestuff']);
});

describe('validate', () => {
    test('nullable', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            nullable: false,
        });
        expect(() => validateProperty(prop, null)).toThrowError('cannot be null');
        expect(validateProperty(prop, '')).toBe('');
        expect(validateProperty(prop, 'blargh')).toBe('blargh');

        const nullableProp = createPropertyDefinition({
            name: 'example',
            nullable: true,
        });
        expect(validateProperty(nullableProp, null)).toBeNull();
    });

    test('nonEmpty', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            nonEmpty: false,
        });
        expect(validateProperty(prop, '')).toBe('');
        expect(validateProperty(prop, null)).toBeNull();
        const prop1 = createPropertyDefinition({
            name: 'example',
            nonEmpty: true,
        });
        expect(() => validateProperty(prop1, '')).toThrowError('Cannot be an empty string');
        expect(validateProperty(prop1, 'blargh')).toBe('blargh');
        expect(validateProperty(prop1, null)).toBeNull();

        const prop2 = createPropertyDefinition({
            name: 'example',
            nonEmpty: true,
            cast: (x) => x,
        });
        expect(() => validateProperty(prop2, '')).toThrowError('cannot be an empty string');
        expect(validateProperty(prop2, null)).toBeNull();
        expect(validateProperty(prop2, 'blargh')).toBe('blargh');
    });

    test('min', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            min: -1,
            type: 'integer',
        });
        expect(validateProperty(prop, '1')).toBe(1);
        expect(validateProperty(prop, null)).toBeNull();
        expect(() => validateProperty(prop, -2)).toThrowError('Violated the minimum value constraint');
        expect(validateProperty(prop, '-1')).toBe(-1);
    });

    test('minItems', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            minItems: 1,
            type: 'embeddedlist',
        });
        expect(validateProperty(prop, [1, 2])).toEqual([1, 2]);
        expect(() => validateProperty(prop, [])).toThrowError('Less than the required number of elements (0 < 1)');
    });

    test('maxItems', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            maxItems: 0,
            type: 'embeddedlist',
        });
        expect(validateProperty(prop, [])).toEqual([]);
        expect(() => validateProperty(prop, [1])).toThrowError('More than the allowed number of elements (1 > 0)');
    });

    test('check', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            check: (input) => input === '1',
            type: 'string',
        });
        expect(validateProperty(prop, '1')).toBe('1');
        expect(() => validateProperty(prop, '2')).toThrowError('Violated check constraint');
    });

    test('named check', () => {
        const checkIsOne = (input) => input === '1';
        const prop = createPropertyDefinition({
            name: 'example',
            check: checkIsOne,
            type: 'string',
        });
        expect(validateProperty(prop, '1')).toBe('1');
        expect(() => validateProperty(prop, '2')).toThrowError('Violated check constraint of example (checkIsOne)');
    });

    test('max', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            max: 10,
            type: 'integer',
        });
        expect(validateProperty(prop, '1')).toBe(1);
        expect(validateProperty(prop, null)).toBeNull();
        expect(() => validateProperty(prop, '100')).toThrowError('Violated the maximum value constraint');
    });

    test('pattern', () => {
        const stringRegexProp = createPropertyDefinition({
            name: 'example',
            pattern: '^\\d+$',
        });
        expect(validateProperty(stringRegexProp, '1')).toBe('1');
        expect(() => validateProperty(stringRegexProp, '100d')).toThrowError('Violated the pattern constraint');
        expect(validateProperty(stringRegexProp, null)).toBeNull();
    });

    test('choices && !nullable', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            choices: [1, 2, 3],
            cast: Number,
            nullable: false,
        });
        expect(validateProperty(prop, '1')).toBe(1);
        expect(validateProperty(prop, 3)).toBe(3);
        expect(() => validateProperty(prop, '100')).toThrowError('Violated the choices constraint');
    });

    test('choices', () => {
        const prop = createPropertyDefinition({
            name: 'example',
            choices: [1, 2, 3],
            cast: Number,
        });
        expect(validateProperty(prop, '1')).toBe(1);
        expect(validateProperty(prop, null)).toBeNull();
        expect(validateProperty(prop, 3)).toBe(3);
        expect(() => validateProperty(prop, '100')).toThrowError('Violated the choices constraint');
    });
});
