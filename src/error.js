const {ErrorMixin} = require('knowledgebase-parser').error;


class AttributeError extends ErrorMixin {}


module.exports = {AttributeError};
