const {expect} = require('chai');

const {Property} = require('./../src');


describe('Property', () => {
    it('to throw error on missing name', () => {
        expect(() => { new Property({}); }).to.throw('name is a required parameter');
    });
    it('cast choices if given', () => {
        const prop = new Property({name: 'name', choices: ['Stuff', 'OtherStuff', 'morestuff'], cast: x => x.toLowerCase()});
        expect(prop.choices).to.eql(['stuff', 'otherstuff', 'morestuff']);
    });
});
