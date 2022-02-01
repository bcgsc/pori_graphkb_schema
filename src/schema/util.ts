/**
 * Repsonsible for defining the schema.
 * @module schema
 */
import { v4 as uuidV4 } from 'uuid';

import { position } from '@bcgsc-pori/graphkb-parser';

import * as util from '../util';
import { AttributeError } from '../error';

/**
 * Given some set of positions, create position object to check they are valid
 * and create the breakpoint representation strings from them that are used for indexing
 */
const generateBreakRepr = (start, end) => {
    if (!start && !end) {
        return undefined;
    }
    if ((start && !start['@class']) || (end && !end['@class'])) {
        throw new AttributeError('positions must include the @class attribute to specify the position type');
    }
    if ((end && !start)) {
        throw new AttributeError('both start and end are required to define a range');
    }
    const posClass = start['@class'];
    const repr = position.breakRepr(
        new position[posClass](start),
        end
            ? new position[posClass](end)
            : null,
    );
    return repr;
};

const defineSimpleIndex = ({
    model, property, name, indexType = 'NOTUNIQUE',
}) => ({
    name: name || `${model}.${property}`,
    type: indexType,
    properties: [property],
    class: model,
});

const castBreakRepr = (repr) => {
    if (/^[cpg]\./.exec(repr)) {
        return `${repr.slice(0, 2)}${repr.slice(2).toUpperCase()}`;
    }
    return repr.toLowerCase();
};

const BASE_PROPERTIES = {
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
        default: uuidV4,
        generated: true,
        example: '4198e211-e761-4771-b6f8-dadbcc44e9b9',
    },
    createdAt: {
        name: 'createdAt',
        type: 'long',
        mandatory: true,
        nullable: false,
        description: 'The timestamp at which the record was created',
        default: util.timeStampNow,
        generated: true,
        example: 1547245339649,
    },
    updatedAt: {
        name: 'updatedAt',
        type: 'long',
        mandatory: true,
        nullable: false,
        description: 'The timestamp at which the record was last updated',
        default: util.timeStampNow,
        generated: true,
        example: 1547245339649,
    },
    updatedBy: {
        name: 'updatedBy',
        type: 'link',
        mandatory: true,
        nullable: false,
        linkedClass: 'User',
        description: 'The user who last updated the record',
        generated: true,
        example: '#31:1',
    },
    deletedAt: {
        name: 'deletedAt',
        type: 'long',
        description: 'The timestamp at which the record was deleted',
        nullable: false,
        generated: true,
        example: 1547245339649,
    },
    createdBy: {
        name: 'createdBy',
        type: 'link',
        mandatory: true,
        nullable: false,
        linkedClass: 'User',
        description: 'The user who created the record',
        generated: true,
        example: '#31:1',
    },
    deletedBy: {
        name: 'deletedBy',
        type: 'link',
        linkedClass: 'User',
        nullable: false,
        description: 'The user who deleted the record',
        generated: true,
        example: '#31:1',
    },
    history: {
        name: 'history',
        type: 'link',
        nullable: false,
        description: 'Link to the previous version of this record',
        generated: true,
        example: '#31:1',
    },
    groupRestrictions: {
        name: 'groupRestrictions',
        type: 'linkset',
        linkedClass: 'UserGroup',
        description: 'user groups allowed to interact with this record',
        example: ['#33:1', '#33:2'],
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

const activeUUID = (className) => ({
    name: `Active${className}UUID`,
    type: 'unique',
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
