/**
 * Formatting functions
 * @module util
 */
import uuidValidate from 'uuid-validate';
import { AttributeError } from './error';
import * as constants from './constants'; // IMPORTANT, to support for the API and GUI, must be able to patch RID
import { Expose } from './schema/types';

const castUUID = (uuid: string) => {
    if (uuidValidate(uuid, 4)) {
        return uuid;
    }
    throw new Error(`not a valid version 4 uuid ${uuid}`);
};

/**
 * @returns {Number} the current time (unix epoch) as an integer value of ms
 */
const timeStampNow = (): number => new Date().getTime();

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
const looksLikeRID = (rid: string, requireHash = false): boolean => {
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
const castToRID = (string): string => {
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
    throw new AttributeError({ message: `not a valid RID (${string})`, value: string });
};

/**
 * remove multi-character spaces and trim leading/trailing whitespace
 * @param {string} string the input string
 * @returns {string} a string
 */
const castString = (string: string): string => string.toString().replace(/\s+/g, ' ').trim();

/**
 * @param {string} string the input string
 * @returns {string} a string
 * @throws {AttributeError} if the input value was not a string or was null
 */
const castLowercaseString = (string: string): string => {
    if (string === null) {
        throw new AttributeError('cannot cast null to string');
    }
    return castString(string).toLowerCase();
};

/**
 * @param {string} string the input string
 * @returns {string?} a string
 * @throws {AttributeError} if the input value was not a string and not null
 */
const castNullableString = (x): string | null => (x === null
    ? null
    : castString(x));

const castLowercaseNullableString = (x) => (x === null
    ? null
    : castLowercaseString(x));

/**
 * @param {string} string the input string
 * @returns {string} a string
 * @throws {AttributeError} if the input value was an empty string or not a string
 */
const castLowercaseNonEmptyString = (x): string => {
    const result = castLowercaseString(x);

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
const castLowercaseNonEmptyNullableString = (x: string): string | null => (x === null
    ? null
    : castLowercaseNonEmptyString(x));

const castNullableLink = (string): string | null => {
    try {
        if (string === null || string.toString().toLowerCase() === 'null') {
            return null;
        }
    } catch (err) { }
    return castToRID(string);
};

const castInteger = (string): number => {
    if (/^-?\d+$/.exec(string.toString().trim())) {
        return parseInt(string, 10);
    }
    throw new AttributeError(`${string} is not a valid integer`);
};

const trimString = (x): string => x.toString().trim();

const uppercase = (x): string => x.toString().trim().toUpperCase();

const displayOntology = ({
    name = '', sourceId = '', source = '',
}: { name?: string; source?: { displayName?: string } | string; sourceId?: string }) => {
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
    name = '', sourceId = '', sourceIdVersion = '',
}: { name?: string; sourceIdVersion?: string; sourceId?: string }) => {
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

const defaultPermissions = (routes: Partial<Expose> = {}) => {
    const {
        PERMISSIONS: {
            CREATE, READ, UPDATE, NONE, DELETE,
        },
    } = constants;

    const permissions = {
        default: NONE,
        readonly: READ,
    };

    if (routes.QUERY || routes.GET) {
        permissions.default |= READ;
    }
    if (routes.POST) {
        permissions.default |= CREATE;
    }
    if (routes.PATCH) {
        permissions.default |= UPDATE;
    }
    if (routes.DELETE) {
        permissions.default |= DELETE;
    }
    return permissions;
};

const naturalListJoin = (words: string[]): string => {
    if (words.length > 1) {
        return `${words.slice(0, words.length - 1).join(', ')}, and ${words[words.length - 1]}`;
    }
    return words[0];
};

export {
    castInteger,
    castLowercaseString,
    castLowercaseNullableString,
    castLowercaseNonEmptyNullableString,
    castLowercaseNonEmptyString,
    castNullableLink,
    castNullableString,
    castString,
    castToRID,
    castUUID,
    defaultPermissions,
    displayFeature,
    displayOntology,
    looksLikeRID,
    naturalListJoin,
    timeStampNow,
    trimString,
    uppercase,
};
