const {expect} = require('chai');

const {
    ClassModel,
    Property,
    schema: SCHEMA_DEFN
} = require('./../src');


describe('ClassModel', () => {
    describe('descendantTree', () => {
        it('is an single element list for terminal models', () => {
            expect(SCHEMA_DEFN.ProteinPosition.descendantTree()).to.eql([SCHEMA_DEFN.ProteinPosition]);
        });
        it('Includes child models and self', () => {
            const tree = SCHEMA_DEFN.Position.descendantTree().map(model => model.name);
            expect(tree).to.include('ProteinPosition');
            expect(tree).to.include('Position');
        });
        it('On flag excludes abstract models', () => {
            const tree = SCHEMA_DEFN.Position.descendantTree(true).map(model => model.name);
            expect(tree).to.include('ProteinPosition');
            expect(tree).to.not.include('Position');
        });
        it('fetches grandchild models', () => {
            const tree = SCHEMA_DEFN.V.descendantTree().map(model => model.name);
            expect(tree).to.include('Publication');
            expect(tree).to.include('V');
            expect(tree).to.include('Ontology');
        });
    });
    describe('routeName', () => {
        it('does not alter ary suffix', () => {
            const model = new ClassModel({name: 'vocabulary'});
            expect(model.routeName).to.equal('/vocabulary');
        });
        it('does not alter edge class names', () => {
            const model = new ClassModel({name: 'edge', isEdge: true});
            expect(model.routeName).to.equal('/edge');
        });
        it('changes ys to ies', () => {
            const model = new ClassModel({name: 'ontology'});
            expect(model.routeName).to.equal('/ontologies');
        });
        it('adds s to regular class names', () => {
            const model = new ClassModel({name: 'statement'});
            expect(model.routeName).to.equal('/statements');
        });
    });
    describe('subclassModel', () => {
        const child = new ClassModel({name: 'child'});
        const parent = new ClassModel({name: 'parent', subclasses: [child]});
        const grandparent = new ClassModel({name: 'grandparent', subclasses: [parent]});
        it('errors when the class does not exist', () => {
            expect(() => {
                grandparent.subClassModel('badName');
            }).to.throw('was not found as a subclass');
        });
        it('returns an immeadiate subclass', () => {
            expect(parent.subClassModel('child')).to.eql(child);
        });
        it('returns a subclass of a subclass recursively', () => {
            expect(grandparent.subClassModel('child')).to.eql(child);
        });
    });
    describe('queryProperties', () => {
        const child = new ClassModel({
            name: 'child',
            properties: {childProp: {name: 'childProp'}}
        });
        const parent = new ClassModel({name: 'parent', subclasses: [child], properties: {}});
        const grandparent = new ClassModel({
            name: 'grandparent',
            subclasses: [parent],
            properties: {grandProp: {name: 'grandProp'}}
        });
        it('fetches grandfathered properties', () => {
            const queryProp = grandparent.queryProperties;
            expect(queryProp).to.have.property('childProp');
            expect(queryProp).to.have.property('grandProp');
        });
        it('ok when no subclasses', () => {
            const queryProp = child.queryProperties;
            expect(Object.keys(queryProp)).to.eql(['childProp']);
        });
    });
    describe('inheritance', () => {
        const person = new ClassModel({
            name: 'person',
            properties: {
                gender: {name: 'gender', default: 'not specified'},
                name: {name: 'name', mandatory: true}
            }
        });
        const child = new ClassModel({
            name: 'child',
            properties: {
                mom: {name: 'mom', mandatory: true, cast: x => x.toLowerCase()},
                age: {name: 'age'}
            },
            inherits: [person],
            targetModel: true
        });

        it('child required returns person attr', () => {
            expect(person.required).to.eql(['name']);
            expect(child.required).to.eql(['mom', 'name']);
        });
        it('child optional returns person attr', () => {
            expect(person.optional).to.eql(['gender']);
            expect(child.optional).to.eql(['age', 'gender']);
        });
        it('inherits to return list of strings', () => {
            expect(person.inherits).to.eql([]);
            expect(child.inherits).to.eql([person.name]);
        });
        it('is not an edge', () => {
            expect(person.isEdge).to.be.false;
            expect(child.isEdge).to.be.true;
        });
    });
    describe('formatRecord', () => {
        let model;
        beforeEach(() => {
            model = new ClassModel({
                name: 'example',
                properties: {
                    req1: new Property({
                        name: 'req1', mandatory: true, nonEmpty: true, type: 'string'
                    }),
                    req2: new Property({
                        name: 'req2', mandatory: true, default: 1, type: 'integer'
                    }),
                    opt1: new Property({name: 'opt1'}),
                    opt2: new Property({
                        name: 'opt2', choices: [2, 3], nullable: true, default: 2, type: 'integer'
                    })
                }
            });
        });
        it('error on empty string', () => {
            expect(() => {
                model.formatRecord({
                    req1: ''
                }, {dropExtra: false, addDefaults: true});
            }).to.throw();
        });
        it('errors on un-cast-able input', () => {
            expect(() => {
                model.formatRecord({
                    req1: 2,
                    req2: 'f45'
                }, {dropExtra: false, addDefaults: true});
            }).to.throw();
        });
        it('errors on un-expected attr', () => {
            expect(() => {
                model.formatRecord({
                    req1: 2,
                    req2: 1,
                    badAttr: 3
                }, {dropExtra: false, ignoreExtra: false, addDefaults: false});
            }).to.throw();
        });
        it('adds defaults', () => {
            const record = model.formatRecord({
                req1: 'term1'
            }, {dropExtra: false, addDefaults: true});
            expect(record).to.have.property('req1', 'term1');
            expect(record).to.have.property('req2', 1);
            expect(record).to.have.property('opt2', 2);
            expect(record).to.not.have.property('opt1');
        });
        it('cast embedded types', () => {
            model = new ClassModel({
                name: 'example',
                properties: {
                    thing: new Property({
                        name: 'thing',
                        type: 'embeddedset',
                        cast: x => x.toLowerCase().trim()
                    })
                }
            });
            const record = model.formatRecord({
                thing: ['aThinNG', 'another THING']
            }, {dropExtra: false, addDefaults: true});
            expect(record).to.have.property('thing');
            expect(record.thing).to.eql(['athinng', 'another thing']);
        });
        it('cast inheritied embedded types', () => {
            model = new ClassModel({
                name: 'example',
                properties: {
                    thing: new Property({
                        name: 'thing',
                        type: 'embeddedset',
                        cast: x => x.toLowerCase().trim()
                    })
                }
            });
            const childModel = new ClassModel({
                name: 'child',
                inherits: [model]
            });
            const record = childModel.formatRecord({
                thing: ['aThinNG', 'another THING']
            }, {dropExtra: false, addDefaults: true});
            expect(record).to.have.property('thing');
            expect(record.thing).to.eql(['athinng', 'another thing']);
        });
        it('does not add defaults', () => {
            expect(() => {
                model.formatRecord({
                    req1: 'term1'
                }, {dropExtra: false, addDefaults: false});
            }).to.throw();

            const record = model.formatRecord({
                req1: 'term1', req2: '4'
            }, {dropExtra: false, addDefaults: false});
            expect(record).to.have.property('req1', 'term1');
            expect(record).to.have.property('req2', 4);
            expect(record).to.not.have.property('opt2');
            expect(record).to.not.have.property('opt1');
        });
        it('allows optional parameters', () => {
            const record = model.formatRecord({
                req1: 'term1', req2: '2', opt1: '2'
            }, {dropExtra: false, addDefaults: false});
            expect(record).to.have.property('req1', 'term1');
            expect(record).to.have.property('req2', 2);
            expect(record).to.have.property('opt1', '2');
            expect(record).to.not.have.property('opt2');
        });
        it('error on invalid enum choice', () => {
            expect(() => {
                model.formatRecord({
                    req1: 'term1', opt2: 4, req2: 1
                }, {dropExtra: false, addDefaults: false});
            }).to.throw('Violated the choices constraint');
        });
        it('allow nullable enum', () => {
            const record = model.formatRecord({
                req1: 'term1', opt2: null, req2: 1
            }, {dropExtra: false, addDefaults: false});
            expect(record).to.have.property('req1', 'term1');
            expect(record).to.have.property('opt2', null);
        });
    });
    describe('inheritField', () => {
        const greatGrandParentA = new ClassModel({name: 'monkey madness'});
        const greatGrandParentB = new ClassModel({name: 'blargh', identifiers: 'not the answer'});
        const grandParentA = new ClassModel({name: 'grandparent', inherits: [greatGrandParentA, greatGrandParentB]});
        const grandParentB = new ClassModel({name: 'other grandparent', identifiers: 'the answer'});
        const parentA = new ClassModel({getPreview: 'parent', inherits: [grandParentA]});
        const parentB = new ClassModel({getPreview: 'other parent', inherits: [grandParentB]});
        const root = new ClassModel({inherits: [parentA, parentB], name: 'root'});

        it('selects a grandparent field before a greatgrandparent field', () => {
            expect(root.inheritField('identifiers')).to.eql('the answer');
        });
        it('defaults to null if field is not found in tree', () => {
            expect(root.inheritField('not a key')).to.be.null;
        });
    });
});
