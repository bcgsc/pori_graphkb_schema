import { createClassDefinition } from "../src/class";
import { SchemaDefinition } from '../src/schema';


describe('queryableProperties', () => {
    const schema = new SchemaDefinition({
        child: createClassDefinition({
            name: 'child',
            properties: [{ name: 'childProp' }],
            inherits: ['parent']
        }),
        parent: createClassDefinition({ name: 'parent', properties: [], inherits: ['grandparent'] }),
        grandparent: createClassDefinition({
            name: 'grandparent',
            properties: [{ name: 'grandProp' }],
        }),
        aunt: createClassDefinition({
            name: 'aunt',
            inherits: ['grandparent'],
            properties: [{name: 'auntProp'}]
        })
    })

    test('fetches grandfathered properties', () => {
        const queryProp = schema.queryableProperties('grandparent');
        expect(Object.keys(queryProp).sort()).toEqual(['childProp', 'grandProp', 'auntProp'].sort());
    });

    test('ok when no subclasses', () => {
        const queryProp = schema.queryableProperties('child');
        expect(Object.keys(queryProp).sort()).toEqual(['childProp', 'grandProp']);
    });
});

describe('inheritance', () => {
    const schema = new SchemaDefinition({
        person: createClassDefinition({
            name: 'person',
            properties: [
                { default: 'not specified', name: 'gender' },
                { mandatory: true, name: 'name' },
            ],
        }),
        child: createClassDefinition({
            inherits: ['person'],
            name: 'child',
            properties: [
                { name: 'age' },
                { cast: (x) => x.toLowerCase(), mandatory: true, name: 'mom' },
            ],
        })
    });

    test('child required returns person attr', () => {
        expect(schema.requiredProperties('person')).toEqual(['name']);
        expect(schema.requiredProperties('child').sort()).toEqual(['mom', 'name'].sort());
    });

    test('child optional returns person attr', () => {
        expect(schema.optionalProperties('person')).toEqual(['gender']);
        expect(schema.optionalProperties('child').sort()).toEqual(['age', 'gender'].sort());
    });

    test('inherits to return list of strings', () => {
        expect(schema.models.person.inherits).toEqual([]);
        expect(schema.models.child.inherits).toEqual([schema.models.person.name]);
    });

    test('is not an edge', () => {
        expect(schema.models.person.isEdge).toBe(false);
        expect(schema.models.child.isEdge).toBe(false);
    });
});

describe('formatRecord', () => {
    let schema;

    beforeEach(() => {
        schema = new SchemaDefinition({
            example: createClassDefinition({
                name: 'example',
                properties: [
                    {
                        cast: (x) => x.toLowerCase().trim(),
                        name: 'thing',
                        type: 'embeddedset',
                    },
                    { name: 'opt1' },
                {
                    choices: [2, 3], default: 2, name: 'opt2', nullable: true, type: 'integer',
                },
                {
                    mandatory: true, name: 'req1', nonEmpty: true, type: 'string',
                },
                {
                    default: 1, mandatory: true, name: 'req2', type: 'integer',
                },
                ],
            }),
            child: createClassDefinition({
                inherits: ['example'],
                name: 'child',
            }),
            other: createClassDefinition({
                name: 'other',
                properties: [{
                    cast: (x) => x.toLowerCase().trim(),
                    name: 'thing',
                    type: 'embeddedset',
                }]
            })
        });
    });

    test('error on empty string', () => {
        expect(() => {
            schema.formatRecord('example', {
                req1: '',
            }, { addDefaults: true, dropExtra: false });
        }).toThrow();
    });

    test('errors on un-cast-able input', () => {
        expect(() => {
            schema.formatRecord('example', {
                req1: 2,
                req2: 'f45',
            }, { addDefaults: true, dropExtra: false });
        }).toThrow();
    });

    test('errors on un-expected attr', () => {
        expect(() => {
            schema.formatRecord('example', {
                badAttr: 3,
                req1: 2,
                req2: 1,
            }, { addDefaults: false, dropExtra: false, ignoreExtra: false });
        }).toThrow();
    });

    test('adds defaults', () => {
        const record = schema.formatRecord('example', {
            req1: 'term1',
        }, { addDefaults: true, dropExtra: false });
        expect(record).toHaveProperty('req1', 'term1');
        expect(record).toHaveProperty('req2', 1);
        expect(record).toHaveProperty('opt2', 2);
        expect(record).not.toHaveProperty('opt1');
    });

    test('cast embedded types', () => {
        const record = schema.formatRecord('other', {
            thing: ['aThinNG', 'another THING'],
        }, { addDefaults: true, dropExtra: false });
        expect(record).toHaveProperty('thing');
        expect(record.thing).toEqual(['athinng', 'another thing']);
    });

    test('cast inherited embedded types', () => {
        const record = schema.formatRecord('child', {
            thing: ['aThinNG', 'another THING'], req1: 't', req2: '3'
        }, { addDefaults: true, dropExtra: false });
        expect(record).toHaveProperty('thing');
        expect(record.thing).toEqual(['athinng', 'another thing']);
    });

    test('does not add defaults', () => {
        expect(() => {
            schema.formatRecord('child', {
                req1: 'term1',
            }, { addDefaults: false, dropExtra: false });
        }).toThrow();

        const record = schema.formatRecord('example', {
            req1: 'term1', req2: '4',
        }, { addDefaults: false, dropExtra: false });
        expect(record).toHaveProperty('req1', 'term1');
        expect(record).toHaveProperty('req2', 4);
        expect(record).not.toHaveProperty('opt2');
        expect(record).not.toHaveProperty('opt1');
    });

    test('allows optional parameters', () => {
        const record = schema.formatRecord('example',{
            opt1: '2', req1: 'term1', req2: '2',
        }, { addDefaults: false, dropExtra: false });
        expect(record).toHaveProperty('req1', 'term1');
        expect(record).toHaveProperty('req2', 2);
        expect(record).toHaveProperty('opt1', '2');
        expect(record).not.toHaveProperty('opt2');
    });

    test('error on invalid enum choice', () => {
        expect(() => {
            schema.formatRecord('example',{
                opt2: 4, req1: 'term1', req2: 1,
            }, { addDefaults: false, dropExtra: false });
        }).toThrow('Violated the choices constraint of opt2');
    });

    test('allow nullable enum', () => {
        const record = schema.formatRecord('example',{
            opt2: null, req1: 'term1', req2: 1,
        }, { addDefaults: false, dropExtra: false });
        expect(record).toHaveProperty('req1', 'term1');
        expect(record).toHaveProperty('opt2', null);
    });
});
