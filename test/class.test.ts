import { createClassDefinition } from '../src/class';


describe('createClassDefinition', () => {
    describe('routeName', () => {
        test('does not alter ary suffix', () => {
            const model =createClassDefinition({ name: 'vocabulary' });
            expect(model.routeName).toBe('/vocabulary');
        });

        test('does not alter edge class names', () => {
            const model =createClassDefinition({ name: 'edge', isEdge: true });
            expect(model.routeName).toBe('/edge');
        });

        test('changes ys to ies', () => {
            const model =createClassDefinition({ name: 'ontology' });
            expect(model.routeName).toBe('/ontologies');
        });

        test('adds s to regular class names', () => {
            const model =createClassDefinition({ name: 'statement' });
            expect(model.routeName).toBe('/statements');
        });
        test('does not alter ary suffix', () => {
            const model = createClassDefinition({ name: 'vocabulary' });
            expect(model.routeName).toBe('/vocabulary');
        });

        test('does not alter edge class names', () => {
            const model = createClassDefinition({ isEdge: true, name: 'edge' });
            expect(model.routeName).toBe('/edge');
        });

        test('changes ys to ies', () => {
            const model = createClassDefinition({ name: 'ontology' });
            expect(model.routeName).toBe('/ontologies');
        });

        test('adds s to regular class names', () => {
            const model = createClassDefinition({ name: 'statement' });
            expect(model.routeName).toBe('/statements');
        });
    });
});
