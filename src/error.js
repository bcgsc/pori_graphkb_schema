/**
 * @module error
 */
const {error: {ErrorMixin}} = require('@bcgsc/knowledgebase-parser');


class AttributeError extends ErrorMixin {}

class ValidationError extends ErrorMixin {}


module.exports = {AttributeError, ValidationError};
