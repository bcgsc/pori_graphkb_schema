import { ClassModel } from './class';
import { Property } from './property';
import schema from './definitions';
import * as util from './util';
import * as error from './error';
import * as constants from './constants';

import * as sentenceTemplates from './sentenceTemplates';
import { SchemaDefinition } from './schema';

const schemaDef = new SchemaDefinition(schema);

export {
    ClassModel,
    Property,
    schemaDef as schema,
    util,
    error,
    constants,
    sentenceTemplates,
};
