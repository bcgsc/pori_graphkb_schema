/**
 * Formatting functions
 * @module util
 */
const moment = require('moment');
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
 * @returns {Number} the current time (unix epoch) as an integer value
 */
const timeStampNow = () => moment().valueOf();

/**
 *
 * @param {string} rid the putative @rid value
 * @param {boolean} [requireHash=true] if true the hash must be present
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
            ? /^#\d+:\d+$/
            : /^#?\d+:\d+$/;
        if (pattern.exec(rid.trim())) {
            return true;
        }
    } catch (err) { } // eslint-disable-line no-empty
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
    } if (looksLikeRID(string)) {
        string = `#${string.replace(/^#/, '')}`;
        return new constants.RID(string);
    }
    throw new AttributeError({message: 'not a valid RID', value: string});
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
    return string.toString().toLowerCase().trim();
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


const castDecimalInteger = (string) => {
    if (/^\d+$/.exec(string.toString().trim())) {
        return parseInt(string, 10);
    }
    throw new AttributeError(`${string} is not a valid decimal integer`);
};


const trimString = x => x.toString().trim();


const uppercase = x => x.toString().trim().toUpperCase();


/**
 * Assigns a default getPreview function to the ClassModel. Chooses the first identifier
 * property found on the model instance.
 * @param {ClassModel} classModel - ClassModel object that will have the defaultPreview
 * implementation attached to it.
 */
const defaultPreview = classModel => (item) => {
    const {identifiers} = classModel;
    for (let i = 0; i < identifiers.length; i++) {
        const [identifier, subId] = identifiers[i].split('.');
        if (item[identifier]) {
            return subId
                ? castString(item[identifier][subId])
                : castString(item[identifier]);
        }
    }
    return 'Invalid Record';
};

module.exports = {
    castDecimalInteger,
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
    defaultPreview
};
