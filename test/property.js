const {expect} = require('chai');

const {Property} = require('./../src');


describe('Property', () => {
    it('to throw error on missing name', () => {
        expect(() => { new Property({}); }).to.throw('name is a required parameter'); // eslint-disable-line
    });
    it('cast choices if given', () => {
        const prop = new Property({name: 'name', choices: ['Stuff', 'OtherStuff', 'morestuff'], cast: x => x.toLowerCase()});
        expect(prop.choices).to.eql(['stuff', 'otherstuff', 'morestuff']);
    });
    describe('validate', () => {
        it('nullable', () => {
            const prop = new Property({
                name: 'example',
                nullable: false
            });
            expect(() => prop.validate(null)).to.throw('cannot be null');
            expect(prop.validate('')).to.equal('');
            expect(prop.validate('blargh')).to.equal('blargh');

            const nullableProp = new Property({
                name: 'example',
                nullable: true
            });
            expect(nullableProp.validate(null)).to.be.null;
        });
        it('nonEmpty', () => {
            const prop = new Property({
                name: 'example',
                nonEmpty: false
            });
            expect(prop.validate('')).to.equal('');
            expect(prop.validate(null)).to.equal(null);
            const prop1 = new Property({
                name: 'example',
                nonEmpty: true
            });
            expect(() => prop1.validate('')).to.throw('Cannot be an empty string');
            expect(prop1.validate('blargh')).to.equal('blargh');
            expect(prop1.validate(null)).to.equal(null);

            const prop2 = new Property({
                name: 'example',
                nonEmpty: true,
                cast: x => x
            });
            expect(() => prop2.validate('')).to.throw('cannot be an empty string');
            expect(prop2.validate(null)).to.equal(null);
            expect(prop2.validate('blargh')).to.equal('blargh');
        });
        it('min', () => {
            const prop = new Property({
                name: 'example',
                min: -1,
                type: 'integer'
            });
            expect(prop.validate('1')).to.equal(1);
            expect(prop.validate(null)).to.equal(null);
            expect(() => prop.validate(-2)).to.throw('Violated the minimum value constraint');
            expect(prop.validate('-1')).to.equal(-1);
        });
        it('minItems', () => {
            const prop = new Property({
                name: 'example',
                minItems: 1,
                type: 'embeddedlist'
            });
            expect(prop.validate([1, 2])).to.eql([1, 2]);
            expect(() => prop.validate([])).to.throw('Less than the required number of elements (0 < 1)');
        });
        it('maxItems', () => {
            const prop = new Property({
                name: 'example',
                maxItems: 0,
                type: 'embeddedlist'
            });
            expect(prop.validate([])).to.eql([]);
            expect(() => prop.validate([1])).to.throw('More than the allowed number of elements (1 > 0)');
        });
        it('check', () => {
            const prop = new Property({
                name: 'example',
                check: input => input === '1',
                type: 'string'
            });
            expect(prop.validate('1')).to.eql('1');
            expect(() => prop.validate('2')).to.throw('Violated check constraint');
        });
        it('named check', () => {
            const checkIsOne = input => input === '1';
            const prop = new Property({
                name: 'example',
                check: checkIsOne,
                type: 'string'
            });
            expect(prop.validate('1')).to.eql('1');
            expect(() => prop.validate('2')).to.throw('Violated check constraint of example (checkIsOne)');
        });
        it('max', () => {
            const prop = new Property({
                name: 'example',
                max: 10,
                type: 'integer'
            });
            expect(prop.validate('1')).to.equal(1);
            expect(prop.validate(null)).to.equal(null);
            expect(() => prop.validate('100')).to.throw('Violated the maximum value constraint');
        });
        it('pattern', () => {
            const stringRegexProp = new Property({
                name: 'example',
                pattern: '^\\d+$'
            });
            expect(stringRegexProp.validate('1')).to.equal('1');
            expect(() => stringRegexProp.validate('100d')).to.throw('Violated the pattern constraint');
            expect(stringRegexProp.validate(null)).to.equal(null);

            const regexProp = new Property({
                name: 'example',
                pattern: /^\d+$/
            });
            expect(regexProp.validate('1')).to.equal('1');
            expect(() => regexProp.validate('100d')).to.throw('Violated the pattern constraint');
            expect(regexProp.validate(null)).to.equal(null);
        });
        it('choices && !nullable', () => {
            const prop = new Property({
                name: 'example',
                choices: [1, 2, 3],
                cast: Number,
                nullable: false
            });
            expect(prop.validate('1')).to.equal(1);
            expect(prop.validate(3)).to.equal(3);
            expect(() => prop.validate('100')).to.throw('Violated the choices constraint');
        });
        it('choices', () => {
            const prop = new Property({
                name: 'example',
                choices: [1, 2, 3],
                cast: Number
            });
            expect(prop.validate('1')).to.equal(1);
            expect(prop.validate(null)).to.equal(null);
            expect(prop.validate(3)).to.equal(3);
            expect(() => prop.validate('100')).to.throw('Violated the choices constraint');
        });
    });
});
