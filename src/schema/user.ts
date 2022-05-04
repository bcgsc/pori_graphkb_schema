import isEmail from 'validator/lib/isEmail';

import * as util from '../util';
import { AttributeError } from '../error';
import { EXPOSE_NONE, PERMISSIONS } from '../constants';
import { BASE_PROPERTIES, activeUUID } from './util';
import { ModelTypeDefinition } from '../types';

const models: Record<string, ModelTypeDefinition> = {
    User: {
        permissions: {
            default: PERMISSIONS.READ,
            admin: PERMISSIONS.ALL,
        },
        properties: [
            { ...BASE_PROPERTIES['@rid'] },
            { ...BASE_PROPERTIES['@class'] },
            {
                name: 'name',
                mandatory: true,
                nullable: false,
                description: 'The username',
            },
            {
                name: 'email',
                description: 'the email address to contact this user at',
                cast: (email) => {
                    if (typeof email !== 'string' || !isEmail(email)) {
                        throw new AttributeError(`Email (${email}) does not look like a valid email address`);
                    }
                    return email;
                },
            },
            {
                name: 'groups',
                type: 'linkset',
                linkedClass: 'UserGroup',
                description: 'Groups this user belongs to. Defines permissions for the user',
            },
            { ...BASE_PROPERTIES.uuid },
            { ...BASE_PROPERTIES.createdAt },
            { ...BASE_PROPERTIES.createdBy, mandatory: false },
            { ...BASE_PROPERTIES.deletedAt },
            { ...BASE_PROPERTIES.deletedBy },
            { ...BASE_PROPERTIES.history },
            { ...BASE_PROPERTIES.groupRestrictions },
            {
                name: 'signedLicenseAt',
                type: 'long',
                default: null,
                description: 'This user has read and acknowledged the terms of use as of this date',
            },
            {
                name: 'lastLoginAt',
                type: 'long',
                description: 'The timestamp at which the user last logged in',
                nullable: true,
                example: 1547245339649,
            },
            {
                name: 'firstLoginAt',
                type: 'long',
                description: 'The timestamp at which the user first logged in',
                nullable: true,
                example: 1547245339649,
            },
            {
                name: 'loginCount',
                type: 'integer',
                description: 'The number of times this user has logged in',
                example: 10,
                nullable: true,
            },
        ],
        indices: [
            {
                name: 'ActiveUserName',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
                properties: ['name', 'deletedAt'],
                class: 'User',
            },
            activeUUID('User'),
            {
                name: 'ActiveUserEmail',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: true },
                properties: ['email', 'deletedAt'],
                class: 'User',
            },
        ],
    },
    UserGroup: {
        permissions: {
            default: PERMISSIONS.READ,
            admin: PERMISSIONS.ALL,
        },
        description: 'The role or group which users can belong to. Defines permissions',
        properties: [
            { ...BASE_PROPERTIES['@rid'] },
            { ...BASE_PROPERTIES['@class'] },
            {
                name: 'name',
                mandatory: true,
                nullable: false,
                cast: (value) => (typeof value === 'string'
                    ? util.castLowercaseString(value)
                    : value),
            },
            { ...BASE_PROPERTIES.uuid },
            { ...BASE_PROPERTIES.createdAt },
            { ...BASE_PROPERTIES.createdBy, mandatory: false },
            { ...BASE_PROPERTIES.deletedAt },
            { ...BASE_PROPERTIES.deletedBy },
            { ...BASE_PROPERTIES.history },
            { name: 'permissions', type: 'embedded', linkedClass: 'Permissions' },
            { name: 'description' },
        ],
        indices: [
            {
                name: 'ActiveUserGroupName',
                type: 'UNIQUE',
                metadata: { ignoreNullValues: false },
                properties: ['name', 'deletedAt'],
                class: 'UserGroup',
            },
            activeUUID('UserGroup'),
        ],
    },
    Permissions: {
        routes: EXPOSE_NONE,
        properties: [],
        embedded: true,
    },
};

export default models;
