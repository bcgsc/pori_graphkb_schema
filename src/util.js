/**
 * Formatting functions
 * @module util
 */
const uuidValidate = require('uuid-validate');
const {AttributeError} = require('./error');
const constants = require('./constants'); // IMPORTANT, to support for the API and GUI, must be able to patch RID


const castUUID = (uuid) => {
    if (uuidValidate(uuid, 4)) {
        return uuid;
    }
    throw new Error(`not a valid version 4 uuid ${uuid}`);
};

/**
 * @returns {Number} the current time (unix epoch) as an integer value of ms
 */
const timeStampNow = () => new Date().getTime();


const ORIENTDB_MAX_CLUSTER_ID = 32767;
/**
 *
 * @param {string} rid the putative @rid value
 * @returns {boolean} true if the string follows the expected format for an @rid, false otherwise
 *
 * @example
 * >>> looksLikeRID('#4:10', true);
 * true
 * @example
 * >>> looksLikeRID('4:0', true);
 * false
 * @example
 * >>> looksLikeRID('#4:10', false);
 * true
 * @example
 * >>> looksLikeRID('4:0', false);
 * true
 */
const looksLikeRID = (rid, requireHash = false) => {
    try {
        const pattern = requireHash
            ? /^#-?\d{1,5}:-?\d+$/
            : /^#?-?\d{1,5}:-?\d+$/;
        if (pattern.exec(rid.trim())) {
            const clusterId = Number.parseInt(rid.split(':')[0].replace(/^#/, ''), 10);
            if (clusterId > ORIENTDB_MAX_CLUSTER_ID) {
                return false;
            }
            return true;
        }
    } catch (err) {} // eslint-disable-line no-empty
    return false;
};


/**
 * Given an input object/estring, attemps to return the RID equivalent
 * @param string the input object
 * @returns {String} the record ID
 */
const castToRID = (string) => {
    if (string == null) {
        throw new AttributeError('cannot cast null/undefined to RID');
    }
    if (string instanceof constants.RID) {
        return string;
    } if (typeof string === 'object' && string['@rid'] !== undefined) {
        return castToRID(string['@rid']);
    } if (looksLikeRID(string.toString())) {
        return new constants.RID(`#${string.toString().replace(/^#/, '')}`);
    }
    throw new AttributeError({message: `not a valid RID (${string})`, value: string});
};

/**
 * @param {string} string the input string
 * @returns {string} a string
 * @throws {AttributeError} if the input value was not a string or was null
 */
const castString = (string) => {
    if (string === null) {
        throw new AttributeError('cannot cast null to string');
    }
    return string.toString().toLowerCase().replace(/\s+/g, ' ').trim();
};

/**
 * @param {string} string the input string
 * @returns {string?} a string
 * @throws {AttributeError} if the input value was not a string and not null
 */
const castNullableString = x => (x === null
    ? null
    : castString(x));

/**
 * @param {string} string the input string
 * @returns {string} a string
 * @throws {AttributeError} if the input value was an empty string or not a string
 */
const castNonEmptyString = (x) => {
    const result = x.toString().toLowerCase().trim();
    if (result.length === 0) {
        throw new AttributeError('Cannot be an empty string');
    }
    return result;
};

/**
 * @param {string} string the input string
 * @returns {string?} a string
 * @throws {AttributeError} if the input value was an empty string or not a string and was not null
 */
const castNonEmptyNullableString = x => (x === null
    ? null
    : castNonEmptyString(x));


const castNullableLink = (string) => {
    try {
        if (string === null || string.toString().toLowerCase() === 'null') {
            return null;
        }
    } catch (err) { }
    return castToRID(string);
};


const castInteger = (string) => {
    if (/^-?\d+$/.exec(string.toString().trim())) {
        return parseInt(string, 10);
    }
    throw new AttributeError(`${string} is not a valid integer`);
};


const trimString = x => x.toString().trim();


const uppercase = x => x.toString().trim().toUpperCase();


const displayOntology = ({
    name = '', sourceId = '', source = ''
}) => {
    if (!sourceId) {
        return name;
    }

    if (!name && /^\d+$/.exec(sourceId)) {
        return `${source.displayName || source}:${sourceId}`;
    }
    if (sourceId === name) {
        return sourceId;
    }
    return `${name} [${sourceId.toUpperCase()}]`;
};


const displayFeature = ({
    name = '', sourceId = '', sourceIdVersion = ''
}) => {
    if (sourceId.startsWith('hgnc:')) {
        return name.toUpperCase();
    }
    if (/^\d+$/.exec(sourceId)) {
        return name;
    }
    if (sourceIdVersion && /^\d+$/.exec(sourceIdVersion)) {
        return `${sourceId.toUpperCase()}.${sourceIdVersion}`;
    }
    if (/^((N[MPGR]_)|(ENS[GTP]))?\d+$/i.exec(sourceId)) {
        return sourceId.toUpperCase();
    }

    return sourceId || name;
};


module.exports = {
    castInteger,
    castNullableLink,
    castNullableString,
    castNonEmptyString,
    castNonEmptyNullableString,
    castString,
    castToRID,
    castUUID,
    trimString,
    uppercase,
    timeStampNow,
    looksLikeRID,
    displayFeature,
    displayOntology
};
