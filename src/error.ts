/**
 * @module error
 */
import { ErrorMixin } from '@bcgsc-pori/graphkb-parser';

class ValidationError extends ErrorMixin {}

export {
    ValidationError, ErrorMixin,
};
