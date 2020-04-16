const isEmail = require('isemail');

const util = require('../util');
const { AttributeError } = require('../error');
const {
    EXPOSE_NONE, PERMISSIONS,
} = require('../constants');
const {
    BASE_PROPERTIES, activeUUID,
} = require('./util');


module.exports = {
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
                    if (!isEmail(email)) {
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
        ],
        indices: [
            {
                name: 'ActiveUserName',
                type: 'unique',
                metadata: { ignoreNullValues: false },
                properties: ['name', 'deletedAt'],
                class: 'User',
            },
            activeUUID('User'),
            {
                name: 'ActiveUserEmail',
                type: 'unique',
                metadata: { ignoreNullValues: true },
                properties: ['email', 'deletedAt'],
                class: 'User',
            },
        ],
        identifiers: ['name', '@rid'],
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
                name: 'name', mandatory: true, nullable: false, cast: util.castLowercaseString,
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
                type: 'unique',
                metadata: { ignoreNullValues: false },
                properties: ['name', 'deletedAt'],
                class: 'UserGroup',
            },
            activeUUID('UserGroup'),
        ],
        identifiers: ['name'],
    },
    Permissions: {
        routes: EXPOSE_NONE,
        properties: [],
        embedded: true,
    },
};
