import { EXPOSE_READ } from '../constants';
import { ModelType } from './types';
import { defineSimpleIndex, BASE_PROPERTIES, activeUUID } from './util';

const edgeModels: Record<string, ModelType> = {
    E: {
        description: 'Edges',
        routes: EXPOSE_READ,
        isAbstract: true,
        isEdge: true,
        properties: [
            { ...BASE_PROPERTIES['@rid'] },
            { ...BASE_PROPERTIES['@class'] },
            { ...BASE_PROPERTIES.uuid },
            { ...BASE_PROPERTIES.createdAt },
            { ...BASE_PROPERTIES.createdBy },
            { ...BASE_PROPERTIES.deletedAt },
            { ...BASE_PROPERTIES.deletedBy },
            { ...BASE_PROPERTIES.history },
            { name: 'comment', type: 'string' },
        ],
        indices: [activeUUID('E'), defineSimpleIndex({ model: 'E', property: 'createdAt' })],
    },
    AliasOf: {
        description: 'The source record is an equivalent representation of the target record, both of which are from the same source',
    },
    Cites: { description: 'Generally refers to relationships between publications. For example, some article cites another' },
    CrossReferenceOf: { description: 'The source record is an equivalent representation of the target record from a different source' },
    DeprecatedBy: { description: 'The target record is a newer version of the source record' },
    ElementOf: { description: 'The source record is part of (or contained within) the target record' },
    GeneralizationOf: { description: 'The source record is a less specific (or more general) instance of the target record' },
    Infers: {
        description: 'Given the source record, the target record is also expected. For example given some genomic variant we infer the protein change equivalent',
        sourceModel: 'Variant',
        targetModel: 'Variant',
    },
    SubClassOf: { description: 'The source record is a subset of the target record' },
    TargetOf: {
        description: 'The source record is a target of the target record. For example some gene is the target of a particular drug',
        properties: [
            { ...BASE_PROPERTIES.in },
            { ...BASE_PROPERTIES.out },
            { name: 'source', type: 'link', linkedClass: 'Source' },
            { name: 'actionType', description: 'The type of action between the gene and drug', example: 'inhibitor' },
        ],
    },
};

for (const name of [
    'AliasOf',
    'Cites',
    'CrossReferenceOf',
    'DeprecatedBy',
    'ElementOf',
    'GeneralizationOf',
    'Infers',
    'OppositeOf',
    'SubClassOf',
    'TargetOf',
]) {
    const sourceProp = { name: 'source', type: 'link' as const, linkedClass: 'Source' };
    let reverseName;

    if (name.endsWith('Of')) {
        reverseName = `Has${name.slice(0, name.length - 2)}`;
    } else if (name.endsWith('By')) {
        reverseName = `${name.slice(0, name.length - 3)}s`;
    } else if (name === 'Infers') {
        reverseName = 'InferredBy';
    } else {
        reverseName = `${name.slice(0, name.length - 1)}dBy`;
    }
    edgeModels[name] = {
        isEdge: true,
        reverseName,
        inherits: ['E'],
        sourceModel: 'Ontology',
        targetModel: 'Ontology',
        properties: [
            { ...BASE_PROPERTIES.in },
            { ...BASE_PROPERTIES.out },
            sourceProp,
        ],
        indices: [ // add index on the class so it doesn't apply across classes
            {
                name: `${name}.restrictMultiplicity`,
                type: 'unique',
                metadata: { ignoreNullValues: false },
                properties: ['deletedAt', 'in', 'out', 'source'],
                class: name,
            },
        ],
        ...edgeModels[name] || {},
    };
}

export default edgeModels;
