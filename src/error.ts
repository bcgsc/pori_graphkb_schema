/**
 * @module error
 */
import { ErrorMixin } from '@bcgsc-pori/graphkb-parser';

class ValidationError extends ErrorMixin {}

export {
    ValidationError as AttributeError, // Old name, alias for compatibility
    ValidationError,
};
