/**
 * Repsonsible for defining the schema.
 * @module schema
 */
import { v4 as uuidV4 } from 'uuid';

import { position, constants } from '@bcgsc-pori/graphkb-parser';

import * as util from '../util';
import { ValidationError } from '../error';
import { IndexType, PropertyTypeDefinition } from '../types';

const CLASS_PREFIX = (() => {
    const result = {};
    Object.entries(constants.PREFIX_CLASS).forEach(([prefix, className]) => {
        result[className] = prefix;
    });
    return result;
})();

/**
 * Given some set of positions, create position object to check they are valid
 * and create the breakpoint representation strings from them that are used for indexing
 */
const generateBreakRepr = (
    start: position.AnyPosition | undefined,
    end: position.AnyPosition | undefined,
): string | undefined => {
    if (!start) {
        if (!end) {
            return undefined;
        }
        throw new ValidationError('both start and end are required to define a range');
    }

    if ((start && !start['@class']) || (end && !end['@class'])) {
        throw new ValidationError('positions must include the @class attribute to specify the position type');
    }

    return position.createBreakRepr(
        { ...start, prefix: CLASS_PREFIX[start['@class']] },
        end
            ? { ...end, prefix: CLASS_PREFIX[end['@class']] }
            : end,
    );
};

const defineSimpleIndex = (opts: { model: string; property: string }): IndexType => {
    const { model, property } = opts;
    return ({
        name: `${model}.${property}`,
        type: 'NOTUNIQUE',
        properties: [property],
        class: model,
    });
};

const castBreakRepr = (repr: string): string => {
    if (/^[cpg]\./.exec(repr)) {
        return `${repr.slice(0, 2)}${repr.slice(2).toUpperCase()}`;
    }
    return repr.toLowerCase();
};

type BasePropertyName = '@rid' | '@class' | 'uuid' | 'createdAt' | 'updatedAt' | 'updatedBy' | 'deletedAt' | 'createdBy' | 'deletedBy' | 'history' | 'groupRestrictions' | 'in' | 'out' | 'displayName';

const BASE_PROPERTIES: { [P in BasePropertyName]: PropertyTypeDefinition } = {
    '@rid': {
        name: '@rid',
        pattern: '^#\\d+:\\d+$',
        description: 'The record identifier',
        cast: util.castToRID,
        generated: true,
    },
    '@class': {
        name: '@class',
        description: 'The database class this record belongs to',
        cast: util.trimString,
        generated: false,
    },
    uuid: {
        name: 'uuid',
        type: 'string',
        mandatory: true,
        nullable: false,
        readOnly: true,
        description: 'Internal identifier for tracking record history',
        cast: util.castUUID,
        default: uuidV4 as () => string,
        generated: true,
        examples: ['4198e211-e761-4771-b6f8-dadbcc44e9b9'],
    },
    createdAt: {
        name: 'createdAt',
        type: 'long',
        mandatory: true,
        nullable: false,
        description: 'The timestamp at which the record was created',
        default: util.timeStampNow,
        generated: true,
        examples: [1547245339649],
    },
    updatedAt: {
        name: 'updatedAt',
        type: 'long',
        mandatory: true,
        nullable: false,
        description: 'The timestamp at which the record was last updated',
        default: util.timeStampNow,
        generated: true,
        examples: [1547245339649],
    },
    updatedBy: {
        name: 'updatedBy',
        type: 'link',
        mandatory: true,
        nullable: false,
        linkedClass: 'User',
        description: 'The user who last updated the record',
        generated: true,
        examples: ['#31:1'],
    },
    deletedAt: {
        name: 'deletedAt',
        type: 'long',
        description: 'The timestamp at which the record was deleted',
        nullable: false,
        generated: true,
        examples: [1547245339649],
    },
    createdBy: {
        name: 'createdBy',
        type: 'link',
        mandatory: true,
        nullable: false,
        linkedClass: 'User',
        description: 'The user who created the record',
        generated: true,
        examples: ['#31:1'],
    },
    deletedBy: {
        name: 'deletedBy',
        type: 'link',
        linkedClass: 'User',
        nullable: false,
        description: 'The user who deleted the record',
        generated: true,
        examples: ['#31:1'],
    },
    history: {
        name: 'history',
        type: 'link',
        nullable: false,
        description: 'Link to the previous version of this record',
        generated: true,
        examples: ['#31:1'],
    },
    groupRestrictions: {
        name: 'groupRestrictions',
        type: 'linkset',
        linkedClass: 'UserGroup',
        description: 'user groups allowed to interact with this record',
        examples: [['#33:1', '#33:2']],
    },
    in: {
        name: 'in',
        type: 'link',
        description: 'The record ID of the vertex the edge goes into, the target/destination vertex',
        mandatory: true,
        nullable: false,
    },
    out: {
        name: 'out',
        type: 'link',
        description: 'The record ID of the vertex the edge comes from, the source vertex',
        mandatory: true,
        nullable: false,
    },
    displayName: {
        name: 'displayName',
        type: 'string',
        description: 'Optional string used for display in the web application. Can be overwritten w/o tracking',
        default: (rec) => rec.name || null,
        generationDependencies: true,
        cast: util.castString,
    },
};

const activeUUID = (className: string): IndexType => ({
    name: `Active${className}UUID`,
    type: 'UNIQUE',
    metadata: { ignoreNullValues: false },
    properties: ['uuid', 'deletedAt'],
    class: className,
});

export {
    activeUUID,
    BASE_PROPERTIES,
    castBreakRepr,
    defineSimpleIndex,
    generateBreakRepr,
};
