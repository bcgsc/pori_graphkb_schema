const util = require('../util');
const {
    EXPOSE_NONE,
} = require('../constants');
const {
    BASE_PROPERTIES, activeUUID,
} = require('./util');


module.exports = {
    User: {
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
        ],
        identifiers: ['name', '@rid'],
    },
    UserGroup: {
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
        expose: EXPOSE_NONE,
        properties: [],
        embedded: true,
    },
};
