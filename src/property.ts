/**
 * @module property
 */
import { ValidationError } from './error';

import * as util from './util';
import { PropertyDefinition, DbType, PropertyDefinitionInput } from './types';

/**
* @param {PropertyDefinition} prop the property model to validate against
* @param inputValue the input value to be validated
*
* @throws {ValidationError} if the input value violates any of the property model constraints
*
* @returns the cast input value
*/
export const validateProperty = (prop: PropertyDefinition, inputValue: unknown): unknown => {
    const values = inputValue instanceof Array
        ? inputValue
        : [inputValue];

    if (values.length > 1 && !prop.iterable) {
        throw new ValidationError({
            message: `The ${prop.name} property is not iterable but has been given multiple values`,
            field: prop.name,
        });
    }

    const result: unknown[] = [];

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
            } catch (err: any) {
                throw new ValidationError({
                    message: `Failed casting ${prop.name}: ${err.message}`,
                    field: prop.name,
                    castFunction: prop.cast,
                });
            }
        }
        result.push(castValue);

        if (prop.nonEmpty && castValue === '') {
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
            if (prop.choices && !prop.choices.includes(castValue)) {
                throw new ValidationError({
                    message: `Violated the choices constraint of ${
                        prop.name
                    }. ${
                        castValue
                    } is not one of the expected values [${
                        prop.choices.join(', ')
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

export const createPropertyDefinition = (opt: PropertyDefinitionInput): PropertyDefinition => {
    const {
        type: inputType,
        default: inputDefault,
        ...rest
    } = opt;
    const defaultType = ((opt.min !== undefined || opt.max !== undefined) && !opt.type)
        ? 'integer'
        : 'string';
    const type: DbType = inputType || defaultType;

    let defaultCast: undefined | ((value: any) => unknown);

    if (!opt.cast) { // set the default util.cast functions
        if (type === 'integer') {
            defaultCast = util.castInteger;
        } else if (type === 'string') {
            if (!opt.nullable) {
                defaultCast = (opt.nonEmpty
                    ? util.castLowercaseNonEmptyString
                    : util.castLowercaseString);
            } else {
                defaultCast = (opt.nonEmpty
                    ? util.castLowercaseNonEmptyNullableString
                    : util.castLowercaseNullableString);
            }
        } else if (type.includes('link')) {
            if (!opt.nullable) {
                defaultCast = util.castToRID;
            } else {
                defaultCast = util.castNullableLink;
            }
        }
    }

    let generateDefault,
        defaultValue;

    if (opt.default !== undefined) {
        if (opt.default instanceof Function) {
            generateDefault = opt.default;
        } else {
            defaultValue = opt.default;
        }
    }

    const castFunction = opt.cast || defaultCast;
    let choices: undefined | unknown[];

    if (castFunction && opt.choices) {
        choices = opt.choices.map(castFunction);
    }

    const result: PropertyDefinition = {
        ...rest,
        type,
        cast: castFunction,
        default: defaultValue,
        generateDefault,
        description: opt.description || '',
        generated: Boolean(opt.generated),
        generationDependencies: Boolean(opt.generationDependencies),
        iterable: Boolean(/(set|list|bag|map)/ig.exec(type)),
        nullable: (
            opt.nullable === undefined
                ? true
                : opt.nullable
        ),
        fulltextIndexed: Boolean(opt.fulltextIndexed),
        indexed: Boolean(opt.indexed),
        choices,
        examples: opt.examples || choices,
    };

    return result;
};
