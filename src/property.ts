/**
 * @module property
 */
import { ValidationError } from './error';

import * as util from './util';
import { DbType, Property } from './types';

interface DefinePropertyOptions {
    name: string;
    cast?: (arg0: unknown) => unknown;
    description?: string;
    examples?: unknown[];
    generated?: boolean;
    generationDependencies?: boolean;
    linkedClass?: string;
    mandatory?: boolean; // default false
    max?: number;
    maxItems?: number;
    min?: number;
    minItems?: number;
    minLength?: number;
    nullable?: boolean;
    pattern?: RegExp;
    type: DbType;
    enum?: unknown[],
    check?: (arg0: unknown) => boolean;
    defaultValue?: () => unknown | null | string | number;
}

const defineProperty = ({ defaultValue, ...opt }: DefinePropertyOptions): Property => {
    const defn: Property = { ...opt, iterable: false };

    if (!opt.name) {
        throw new ValidationError('name is a required parameter');
    }

    if (defaultValue !== undefined) {
        if (defaultValue instanceof Function) {
            defn.generateDefault = defaultValue;
        } else {
            defn.default = defaultValue;
        }
    }
    defn.iterable = Boolean(/(set|list|bag|map)/ig.exec(defn.type));

    if (defn.examples === undefined && defn.enum) {
        defn.examples = defn.enum;
    }

    if (!defn.cast) { // set the default util.cast functions
        if (defn.type === 'integer') {
            defn.cast = util.castInteger;
        } else if (defn.type === 'string') {
            if (!defn.nullable) {
                defn.cast = defn.minLength && defn.minLength > 0
                    ? util.castLowercaseNonEmptyString
                    : util.castLowercaseString;
            } else {
                defn.cast = defn.minLength && defn.minLength > 0
                    ? util.castLowercaseNonEmptyNullableString
                    : util.castLowercaseNullableString;
            }
        } else if (defn.type.includes('link')) {
            if (!defn.nullable) {
                defn.cast = util.castToRID;
            } else {
                defn.cast = util.castNullableLink;
            }
        }
    }
    if (defn.enum && defn.cast) {
        defn.enum = defn.enum.map((choice) => defn.cast(choice));
    }
    return defn;
};

/**
 * @param {Property} prop the property model to validate against
 * @param inputValue the input value to be validated
 *
 * @throws {ValidationError} if the input value violates any of the property model constraints
 *
 * @returns the cast input value
 */
const validateProperty = (prop: Property, inputValue: unknown) => {
    const values = inputValue instanceof Array
        ? inputValue
        : [inputValue];

    if (values.length > 1 && !prop.iterable) {
        throw new ValidationError({
            message: `The ${prop.name} property is not iterable but has been given multiple values`,
            field: prop.name,
        });
    }

    const result: Array<unknown> = [];

    // add cast and type checking should apply to the inner elements of an iterable
    for (const value of values) {
        if (value === null && !prop.nullable) {
            throw new ValidationError({
                message: `The ${prop.name} property cannot be null`,
                field: prop.name,
            });
        }
        let castValue = value;

        if (prop.cast && (!prop.nullable || castValue !== null)) {
            try {
                castValue = prop.cast(value);
            } catch (err) {
                throw new ValidationError({
                    message: `Failed casting ${prop.name}: ${err.message}`,
                    field: prop.name,
                    castFunction: prop.cast,
                });
            }
        }
        result.push(castValue);

        if (prop.minLength && castValue === '') {
            throw new ValidationError({
                message: `The ${prop.name} property cannot be an empty string`,
                field: prop.name,
            });
        }
        if (castValue !== null) {
            if (prop.min !== undefined && prop.min !== null && castValue < prop.min) {
                throw new ValidationError({
                    message: `Violated the minimum value constraint of ${prop.name} (${castValue} < ${prop.min})`,
                    field: prop.name,
                });
            }
            if (prop.max !== undefined && prop.max !== null && castValue > prop.max) {
                throw new ValidationError({
                    message: `Violated the maximum value constraint of ${prop.name} (${castValue} > ${prop.max})`,
                    field: prop.name,
                });
            }
            if (prop.pattern && !castValue.toString().match(prop.pattern)) {
                throw new ValidationError({
                    message: `Violated the pattern constraint of ${prop.name}. ${castValue} does not match the expected pattern ${prop.pattern}`,
                    field: prop.name,
                });
            }
            if (prop.enum && !prop.enum.includes(castValue)) {
                throw new ValidationError({
                    message: `Violated the enum constraint of ${prop.name
                    }. ${castValue
                    } is not one of the expected values [${prop.enum.join(', ')
                    }]`,
                    field: prop.name,
                });
            }
        }
        if (prop.check && !prop.check(castValue)) {
            throw new ValidationError({
                message: `Violated check constraint of ${prop.name}${prop.check.name
                    ? ` (${prop.check.name})`
                    : ''
                }`,
                field: prop.name,
                value: castValue,
            });
        }
    }

    // check minItems and maxItems
    if (prop.minItems && result.length < prop.minItems) {
        throw new ValidationError(`Violated the minItems constraint of ${prop.name}. Less than the required number of elements (${result.length} < ${prop.minItems})`);
    }
    if ((prop.maxItems || prop.maxItems === 0) && result.length > prop.maxItems) {
        throw new ValidationError(`Violated the maxItems constraint of ${prop.name}. More than the allowed number of elements (${result.length} > ${prop.maxItems})`);
    }
    return inputValue instanceof Array
        ? result
        : result[0];
};

export {
    Property, validateProperty, defineProperty, DefinePropertyOptions,
};
