const {
    ClassModel,
    Property,
    schema: {schema: SCHEMA_DEFN}
} = require('./../src');


describe('ClassModel', () => {
    describe('descendantTree', () => {
        it('is an single element list for terminal models', () => {
            expect(SCHEMA_DEFN.ProteinPosition.descendantTree()).toEqual([SCHEMA_DEFN.ProteinPosition]);
        });
        it('Includes child models and self', () => {
            const tree = SCHEMA_DEFN.Position.descendantTree().map(model => model.name);
            expect(tree).toEqual(expect.arrayContaining(['ProteinPosition']));
            expect(tree).toEqual(expect.arrayContaining(['Position']));
        });
        it('On flag excludes abstract models', () => {
            const tree = SCHEMA_DEFN.Position.descendantTree(true).map(model => model.name);
            expect(tree).toEqual(expect.arrayContaining(['ProteinPosition']));
            expect(tree).toEqual(expect.not.arrayContaining(['Position']));
        });
        it('fetches grandchild models', () => {
            const tree = SCHEMA_DEFN.V.descendantTree().map(model => model.name);
            expect(tree).toEqual(expect.arrayContaining(['Publication']));
            expect(tree).toEqual(expect.arrayContaining(['V']));
            expect(tree).toEqual(expect.arrayContaining(['Ontology']));
        });
    });
    describe('routeName', () => {
        it('does not alter ary suffix', () => {
            const model = new ClassModel({name: 'vocabulary'});
            expect(model.routeName).toBe('/vocabulary');
        });
        it('does not alter edge class names', () => {
            const model = new ClassModel({name: 'edge', isEdge: true});
            expect(model.routeName).toBe('/edge');
        });
        it('changes ys to ies', () => {
            const model = new ClassModel({name: 'ontology'});
            expect(model.routeName).toBe('/ontologies');
        });
        it('adds s to regular class names', () => {
            const model = new ClassModel({name: 'statement'});
            expect(model.routeName).toBe('/statements');
        });
    });
    describe('subclassModel', () => {
        const child = new ClassModel({name: 'child'});
        const parent = new ClassModel({name: 'parent', subclasses: [child]});
        const grandparent = new ClassModel({name: 'grandparent', subclasses: [parent]});
        it('errors when the class does not exist', () => {
            expect(() => {
                grandparent.subClassModel('badName');
            }).toThrowError('was not found as a subclass');
        });
        it('returns an immeadiate subclass', () => {
            expect(parent.subClassModel('child')).toEqual(child);
        });
        it('returns a subclass of a subclass recursively', () => {
            expect(grandparent.subClassModel('child')).toEqual(child);
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
            expect(queryProp).toHaveProperty('childProp');
            expect(queryProp).toHaveProperty('grandProp');
        });
        it('ok when no subclasses', () => {
            const queryProp = child.queryProperties;
            expect(Object.keys(queryProp)).toEqual(['childProp']);
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
            expect(person.required).toEqual(['name']);
            expect(child.required).toEqual(['mom', 'name']);
        });
        it('child optional returns person attr', () => {
            expect(person.optional).toEqual(['gender']);
            expect(child.optional).toEqual(['age', 'gender']);
        });
        it('inherits to return list of strings', () => {
            expect(person.inherits).toEqual([]);
            expect(child.inherits).toEqual([person.name]);
        });
        it('is not an edge', () => {
            expect(person.isEdge).toBe(false);
            expect(child.isEdge).toBe(true);
        });
    });
    describe('formatRecord', () => {
        let model;
        beforeEach(() => {
            const childModel = new ClassModel({
                name: 'child',
                properties: {
                    name: new Property({name: 'name', type: 'string'})
                }
            });
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
                    }),
                    opt3: new Property({
                        name: 'opt3', type: 'embedded', linkedClass: childModel
                    }),
                    opt4: new Property({
                        name: 'opt4', type: 'embeddedset', linkedClass: childModel
                    })
                }
            });
        });
        it('casts an embedded list/set', () => {
            const record = model.formatRecord({
                req1: 'term1', opt3: {name: 'bob'}
            }, {dropExtra: false, addDefaults: true});
            expect(record).toHaveProperty('opt3');
            expect(record.opt3).toEqual({name: 'bob'});
        });
        it('casts an embedded property', () => {
            const record = model.formatRecord({
                req1: 'term1', opt4: [{name: 'bob'}, {name: 'alice'}]
            }, {dropExtra: false, addDefaults: true});
            expect(record).toHaveProperty('opt4');
            expect(record.opt4).toEqual([{name: 'bob'}, {name: 'alice'}]);
        });
        it('error on empty string', () => {
            expect(() => {
                model.formatRecord({
                    req1: ''
                }, {dropExtra: false, addDefaults: true});
            }).toThrowError();
        });
        it('errors on un-cast-able input', () => {
            expect(() => {
                model.formatRecord({
                    req1: 2,
                    req2: 'f45'
                }, {dropExtra: false, addDefaults: true});
            }).toThrowError();
        });
        it('errors on un-expected attr', () => {
            expect(() => {
                model.formatRecord({
                    req1: 2,
                    req2: 1,
                    badAttr: 3
                }, {dropExtra: false, ignoreExtra: false, addDefaults: false});
            }).toThrowError();
        });
        it('adds defaults', () => {
            const record = model.formatRecord({
                req1: 'term1'
            }, {dropExtra: false, addDefaults: true});
            expect(record).toHaveProperty('req1', 'term1');
            expect(record).toHaveProperty('req2', 1);
            expect(record).toHaveProperty('opt2', 2);
            expect(record).not.toHaveProperty('opt1');
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
            expect(record).toHaveProperty('thing');
            expect(record.thing).toEqual(['athinng', 'another thing']);
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
            expect(record).toHaveProperty('thing');
            expect(record.thing).toEqual(['athinng', 'another thing']);
        });
        it('does not add defaults', () => {
            expect(() => {
                model.formatRecord({
                    req1: 'term1'
                }, {dropExtra: false, addDefaults: false});
            }).toThrowError();

            const record = model.formatRecord({
                req1: 'term1', req2: '4'
            }, {dropExtra: false, addDefaults: false});
            expect(record).toHaveProperty('req1', 'term1');
            expect(record).toHaveProperty('req2', 4);
            expect(record).not.toHaveProperty('opt2');
            expect(record).not.toHaveProperty('opt1');
        });
        it('allows optional parameters', () => {
            const record = model.formatRecord({
                req1: 'term1', req2: '2', opt1: '2'
            }, {dropExtra: false, addDefaults: false});
            expect(record).toHaveProperty('req1', 'term1');
            expect(record).toHaveProperty('req2', 2);
            expect(record).toHaveProperty('opt1', '2');
            expect(record).not.toHaveProperty('opt2');
        });
        it('error on invalid enum choice', () => {
            expect(() => {
                model.formatRecord({
                    req1: 'term1', opt2: 4, req2: 1
                }, {dropExtra: false, addDefaults: false});
            }).toThrowError('Violated the choices constraint');
        });
        it('allow nullable enum', () => {
            const record = model.formatRecord({
                req1: 'term1', opt2: null, req2: 1
            }, {dropExtra: false, addDefaults: false});
            expect(record).toHaveProperty('req1', 'term1');
            expect(record).toHaveProperty('opt2', null);
        });
    });
    describe('inheritance tests', () => {
        const greatGrandParentA = new ClassModel({name: 'monkey madness', properties: {name: {}}});
        const greatGrandParentB = new ClassModel({name: 'blargh', identifiers: 'not the answer'});
        const grandParentA = new ClassModel({name: 'grandparent', inherits: [greatGrandParentA, greatGrandParentB]});
        const grandParentB = new ClassModel({name: 'other grandparent', identifiers: 'the answer'});
        const parentA = new ClassModel({getPreview: 'parent', inherits: [grandParentA]});
        const parentB = new ClassModel({getPreview: 'other parent', inherits: [grandParentB]});
        const root = new ClassModel({inherits: [parentA, parentB], name: 'root', properties: {directName: {}, name: {}}});
        it('inheritsProperty is true for parent properties', () => {
            expect(root.inheritsProperty('name')).toBe(true);
        });
        it('false for direct only properties', () => {
            expect(root.inheritsProperty('directName')).toBe(false);
        });
    });
});
