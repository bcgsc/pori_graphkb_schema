/**
 * @module property
 */
import { ValidationError } from './error';

import * as util from './util';
import {
    DbType, PropertyType, ModelType, PropertyTypeDefinition,
} from './types';

export interface PropertyTypeInput extends Omit<PropertyTypeDefinition, 'linkedClass'> {
    linkedClass?: ModelType;
}

export class Property implements PropertyType {
    readonly name: string;
    readonly cast?: (value: any) => unknown;
    readonly type: DbType;
    readonly pattern?: string;
    readonly description?: string;
    readonly generated?: boolean;
    readonly mandatory?: boolean;
    readonly nullable?: boolean;
    readonly readOnly?: boolean;
    readonly generateDefault?: (rec?: unknown) => unknown;
    readonly check?: (rec?: unknown) => boolean;
    readonly default?: unknown;
    readonly example?: unknown;
    readonly generationDependencies?: boolean;
    readonly nonEmpty?: boolean;
    readonly linkedType?: 'string';
    readonly format?: 'date';
    readonly choices?: unknown[];
    readonly min?: number;
    readonly minItems?: number;
    readonly max?: number;
    readonly maxItems?: number;
    readonly iterable: boolean;
    readonly indexed: boolean;
    readonly fulltextIndexed: boolean;

    // must be initialized after creation
    linkedClass?: ModelType;

    /**
     * create a new property
     *
     * @param {Object} opt options
     * @param {string} opt.name the property name
     * @param {*|Function} opt.default the default value or function for generating the default
     * @param {boolean} opt.generated indicates that this is a generated field and should not be input by the user
     * @param {boolean} opt.generationDependencies indicates that a field should be generated after all other processing is complete b/c it requires other fields
     * @param {*} opt.example an example value to use for help text
     * @param {string} opt.pattern the regex pattern values for this property should follow (used purely in docs)
     * @param {boolean} opt.nullable flag to indicate if the value can be null
     * @param {boolean} opt.mandatory flag to indicate if this property is required
     * @param {boolean} opt.nonEmpty for string properties indicates that an empty string is invalid
     * @param {string} opt.description description for the openapi spec
     * @param {ClassModel} opt.linkedClass if applicable, the class this link should point to or embed
     * @param {Array} opt.choices enum representing acceptable values
     * @param {Number} opt.min minimum value allowed (for intger type properties)
     * @param {Number} opt.max maximum value allowed (for integer type properties)
     * @param {Function} opt.cast the function to be used in formatting values for this property (for list properties it is the function for elements in the list)
     * @param {boolean} opt.indexed if this field is exact indexed for quick search
     * @param {boolean} opt.fulltextIndexed if this field has a fulltext index
     *
     * @return {Property} the new property
     */
    constructor(opt: PropertyTypeInput) {
        this.name = opt.name;

        if (opt.default !== undefined) {
            if (opt.default instanceof Function) {
                this.generateDefault = opt.default;
            } else {
                this.default = opt.default;
            }
        }
        const defaultType = ((opt.min !== undefined || opt.max !== undefined) && !opt.type)
            ? 'integer'
            : 'string';
        this.type = opt.type || defaultType;

        this.cast = opt.cast;
        this.description = opt.description || '';
        this.example = opt.example;
        this.generated = Boolean(opt.generated);
        this.generationDependencies = Boolean(opt.generationDependencies);
        this.iterable = Boolean(/(set|list|bag|map)/ig.exec(this.type));
        this.linkedClass = opt.linkedClass;
        this.mandatory = Boolean(opt.mandatory); // default false
        this.max = opt.max;
        this.maxItems = opt.maxItems;
        this.min = opt.min;
        this.minItems = opt.minItems;
        this.nonEmpty = Boolean(opt.nonEmpty);
        this.nullable = opt.nullable === undefined
            ? true
            : opt.nullable;
        this.pattern = opt.pattern;
        this.check = opt.check;
        this.fulltextIndexed = Boolean(opt.fulltextIndexed);
        this.indexed = Boolean(opt.indexed);

        this.choices = opt.choices;

        if (this.example === undefined && this.choices) {
            [this.example] = this.choices;
        }

        if (!this.cast) { // set the default util.cast functions
            if (this.type === 'integer') {
                this.cast = util.castInteger;
            } else if (this.type === 'string') {
                if (!this.nullable) {
                    this.cast = (this.nonEmpty
                        ? util.castLowercaseNonEmptyString
                        : util.castLowercaseString);
                } else {
                    this.cast = (this.nonEmpty
                        ? util.castLowercaseNonEmptyNullableString
                        : util.castLowercaseNullableString);
                }
            } else if (this.type.includes('link')) {
                if (!this.nullable) {
                    this.cast = util.castToRID;
                } else {
                    this.cast = util.castNullableLink;
                }
            }
        } else if (this.choices) {
            const castFunc: (arg: unknown) => any = this.cast;
            this.choices = this.choices.map((choice) => castFunc(choice));
        }
    }

    /**
     * @param {Property} prop the property model to validate against
     * @param inputValue the input value to be validated
     *
     * @throws {ValidationError} if the input value violates any of the property model constraints
     *
     * @returns the cast input value
     */
    static validateWith(prop: Property, inputValue) {
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
    }

    /**
     * Given some value for a property, ensure that it does not violate the current model contraints
     *
     * @throws {ValidationError} if the input value violates any of the property model constraints
     *
     * @returns the cast input value
     */
    validate(inputValue) {
        return Property.validateWith(this, inputValue);
    }
}
