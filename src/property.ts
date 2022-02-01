/**
 * @module property
 */
import { ValidationError } from './error';

import * as util from './util';

class Property {
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
    constructor(opt) {
        const {
            cast,
            choices,
            default: defaultValue,
            description,
            example,
            generated,
            generationDependencies,
            linkedClass,
            mandatory,
            max,
            maxItems,
            min,
            minItems,
            name,
            nonEmpty,
            nullable = true,
            pattern,
            type = 'string',
            check,
        } = opt;

        if (!name) {
            throw new ValidationError('name is a required parameter');
        }
        this.name = name;

        if (defaultValue !== undefined) {
            if (defaultValue instanceof Function) {
                this.generateDefault = defaultValue;
            } else {
                this.default = defaultValue;
            }
        }
        this.cast = cast;
        this.description = description;
        this.example = example;
        this.generated = Boolean(generated);
        this.generationDependencies = Boolean(generationDependencies);
        this.iterable = Boolean(/(set|list|bag|map)/ig.exec(type));
        this.linkedClass = linkedClass;
        this.mandatory = Boolean(mandatory); // default false
        this.max = max;
        this.maxItems = maxItems;
        this.min = min;
        this.minItems = minItems;
        this.nonEmpty = Boolean(nonEmpty);
        this.nullable = nullable;
        this.pattern = pattern;
        this.type = type;
        this.check = check;

        if (this.min !== undefined || this.max !== undefined) {
            if (type === undefined) {
                this.type = 'integer';
            }
        }
        this.choices = choices;

        if (this.example === undefined && this.choices) {
            this.example = this.choices[0];
        }

        if (!this.cast) { // set the default util.cast functions
            if (this.type === 'integer') {
                this.cast = util.castInteger;
            } else if (this.type === 'string') {
                if (!this.nullable) {
                    this.cast = this.nonEmpty
                        ? util.castLowercaseNonEmptyString
                        : util.castLowercaseString;
                } else {
                    this.cast = this.nonEmpty
                        ? util.castLowercaseNonEmptyNullableString
                        : util.castLowercaseNullableString;
                }
            } else if (this.type.includes('link')) {
                if (!this.nullable) {
                    this.cast = util.castToRID;
                } else {
                    this.cast = util.castNullableLink;
                }
            }
        }
        if (this.choices && this.cast) {
            this.choices = this.choices.map((choice) => this.cast(choice));
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
    static validateWith(prop, inputValue) {
        const values = inputValue instanceof Array
            ? inputValue
            : [inputValue];

        if (values.length > 1 && !prop.iterable) {
            throw new ValidationError({
                message: `The ${prop.name} property is not iterable but has been given multiple values`,
                field: prop.name,
            });
        }

        const result = [];

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

export { Property };
