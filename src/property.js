/**
 * @module property
 */
const {AttributeError, ValidationError} = require('./error');

const util = require('./util');


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
            check
        } = opt;
        if (!name) {
            throw new AttributeError('name is a required parameter');
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
                this.cast = util.castDecimalInteger;
            } else if (this.type === 'string') {
                if (!this.nullable) {
                    this.cast = this.nonEmpty
                        ? util.castNonEmptyString
                        : util.castString;
                } else {
                    this.cast = this.nonEmpty
                        ? util.castNonEmptyNullableString
                        : util.castNullableString;
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
            this.choices = this.choices.map(choice => this.cast(choice));
        }
    }

    /**
     * Given some value for a property, ensure that it does not violate the current model contraints
     *
     * @throws {ValidationError} if the input value violates any of the property model constraints
     *
     * @returns the cast input value
     */
    validate(inputValue) {
        const values = inputValue instanceof Array
            ? inputValue
            : [inputValue];

        if (values.length > 1 && !this.iterable) {
            throw new ValidationError({
                message: `The ${this.name} property is not iterable but has been given multiple values`,
                field: this.name
            });
        }

        const result = [];
        // add cast and type checking should apply to the inner elements of an iterable
        for (const value of values) {
            if (value === null && !this.nullable) {
                throw new ValidationError({
                    message: `The ${this.name} property cannot be null`,
                    field: this.name
                });
            }
            let castValue = value;
            if (this.cast && (!this.nullable || castValue !== null)) {
                try {
                    castValue = this.cast(value);
                } catch (err) {
                    throw new ValidationError({
                        message: err.message,
                        field: this.name,
                        castFunction: this.cast
                    });
                }
            }
            result.push(castValue);
            if (this.nonEmpty && castValue === '') {
                throw new ValidationError({
                    message: `The ${this.name} property cannot be an empty string`,
                    field: this.name
                });
            }
            if (castValue !== null) {
                if (this.min !== undefined && this.min !== null && castValue < this.min) {
                    throw new ValidationError({
                        message: `Violated the minimum value constraint of ${this.name} (${castValue} < ${this.min})`,
                        field: this.name
                    });
                }
                if (this.max !== undefined && this.max !== null && castValue > this.max) {
                    throw new ValidationError({
                        message: `Violated the maximum value constraint of ${this.name} (${castValue} > ${this.max})`,
                        field: this.name
                    });
                }
                if (this.pattern && !castValue.toString().match(this.pattern)) {
                    throw new ValidationError({
                        message: `Violated the pattern constraint of ${this.name}. ${castValue} does not match the expected pattern ${this.pattern}`,
                        field: this.name
                    });
                }
                if (this.choices && !this.choices.includes(castValue)) {
                    throw new ValidationError({
                        message: `Violated the choices constraint of ${
                            this.name
                        }. ${
                            castValue
                        } is not one of the expected values [${
                            this.choices.join(', ')
                        }]`,
                        field: this.name
                    });
                }
            }
            if (this.check && !this.check(castValue)) {
                throw new ValidationError({
                    message: `Violated check constraint${this.check.name
                        ? ` (${this.check.name})`
                        : ''
                    }`,
                    field: this.name
                });
            }
        }
        // check minItems and maxItems
        if (this.minItems && result.length < this.minItems) {
            throw new ValidationError(`Less than the required number of elements (${result.length} < ${this.minItems})`);
        }
        if ((this.maxItems || this.maxItems === 0) && result.length > this.maxItems) {
            throw new ValidationError(`More than the allowed number of elements (${result.length} > ${this.maxItems})`);
        }
        return inputValue instanceof Array
            ? result
            : result[0];
    }
}

module.exports = {Property};
