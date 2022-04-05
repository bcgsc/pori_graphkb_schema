import {
    PropertyDefinition,
    ClassDefinition,
    VertexName,
    EmbeddedVertexName,
    EdgeName,
    ClassName,
    DbType,
    ClassPermissions,
    GraphRecord,
} from './types';
import * as util from './util';
import { ValidationError, ErrorMixin } from './error';
import * as constants from './constants';
import { REVIEW_STATUS, PERMISSIONS } from './constants';
import * as sentenceTemplates from './sentenceTemplates';
import definitions from './definitions';
import { SchemaDefinition } from './schema';

const schemaDef = new SchemaDefinition(definitions);

export type {
    ClassDefinition,
    PropertyDefinition,
    VertexName,
    EmbeddedVertexName,
    EdgeName,
    ClassName,
    DbType,
    ClassPermissions,
    GraphRecord,
};

export {
    schemaDef as schema,
    util,
    ValidationError,
    ErrorMixin,
    REVIEW_STATUS,
    constants,
    PERMISSIONS,
    sentenceTemplates,
    SchemaDefinition,
};
