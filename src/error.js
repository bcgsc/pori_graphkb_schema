/**
 * @module error
 */
const { error: { ErrorMixin } } = require('@bcgsc/knowledgebase-parser');


class ValidationError extends ErrorMixin {}


module.exports = {
    AttributeError: ValidationError, // Old name, alias for compatibility
    ValidationError,
};
