/**
 * @module constants
 */

/**
 * @typedef {Object} Expose
 * @property {boolean} QUERY - create the GET route
 * @property {boolean} GET - create the GET/{rid} route
 * @property {boolean} POST - create the POST route
 * @property {boolean} PATCH - create the PATCH/{rid} route
 * @property {boolean} DELETE - create the DELETE/{rid} route
 */

const EXPOSE_ALL = {
    QUERY: true, PATCH: true, DELETE: true, POST: true, GET: true,
};
const EXPOSE_NONE = {
    QUERY: false, PATCH: false, DELETE: false, POST: false, GET: false,
};
const EXPOSE_EDGE = {
    QUERY: true, PATCH: false, DELETE: true, POST: true, GET: true,
};
const EXPOSE_READ = {
    QUERY: true, PATCH: false, DELETE: false, POST: false, GET: true,
};

const FUZZY_CLASSES = ['AliasOf', 'DeprecatedBy'];

// default separator chars for orientdb full text hash: https://github.com/orientechnologies/orientdb/blob/2.2.x/core/src/main/java/com/orientechnologies/orient/core/index/OIndexFullText.java
const INDEX_SEP_CHARS = ' \r\n\t:;,.|+*/\\=!?[]()';

/**
 * @namespace
 * @property {Number} CREATE permissions for create/insert/post opertations
 * @property {Number} READ permissions for read/get operations
 * @property {Number} UPDATE permissions for update/patch operations
 * @property {Number} DELETE permissions for delete/remove operations
 * @property {Number} NONE no permissions granted
 * @property {Number} ALL all permissions granted
 *
 * @example <caption>getting read/write permissions</caption>
 * > PERMISSIONS.READ | PERMISSIONS.WRITE
 * 0b1100
 *
 * @example <caption>testing permissions</caption>
 * > PERMISSIONS.READ & PERMISSIONS.ALL
 * true
 * > PERMISSIONS.READ & PERMISSIONS.NONE
 * false
 */
const PERMISSIONS = {
    CREATE: 0b1000,
    READ: 0b0100,
    UPDATE: 0b0010,
    DELETE: 0b0001,
    NONE: 0b0000,
};
PERMISSIONS.ALL = PERMISSIONS.READ | PERMISSIONS.CREATE | PERMISSIONS.UPDATE | PERMISSIONS.DELETE;

const REVIEW_STATUS = ['pending', 'not required', 'passed', 'failed', 'initial'];


module.exports = {
    REVIEW_STATUS,
    EXPOSE_ALL,
    EXPOSE_NONE,
    EXPOSE_EDGE,
    EXPOSE_READ,
    FUZZY_CLASSES,
    INDEX_SEP_CHARS,
    PERMISSIONS,
    RID: String, // IMPORTANT: to be patched with orientjs.RID for API and not GUI
};
