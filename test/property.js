const {expect} = require('chai');

const {Property} = require('./../src');


describe('Property', () => {
    it('to throw error on missing name', () => {
        expect(() => { new Property({}); }).to.throw('name is a required parameter');
    });
});
