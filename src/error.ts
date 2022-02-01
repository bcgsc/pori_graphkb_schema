/**
 * @module error
 */
import { error } from '@bcgsc-pori/graphkb-parser';

class ValidationError extends error.ErrorMixin {}

export {
    ValidationError as AttributeError, // Old name, alias for compatibility
    ValidationError,
};
