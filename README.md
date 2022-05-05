# GraphKB Schema

[![codecov](https://codecov.io/gh/bcgsc/pori_graphkb_schema/branch/master/graph/badge.svg?token=0QZTY7RA1R)](https://codecov.io/gh/bcgsc/pori_graphkb_schema) ![build](https://github.com/bcgsc/pori_graphkb_schema/workflows/build/badge.svg?branch=master) [![npm version](https://badge.fury.io/js/%40bcgsc-pori%2Fgraphkb-schema.svg)](https://badge.fury.io/js/%40bcgsc-pori%2Fgraphkb-schema) ![node versions](https://img.shields.io/badge/node-12%20%7C%2014%20%7C%2016-blue) [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.5730411.svg)](https://doi.org/10.5281/zenodo.5730411)

This repository is part of the [platform for oncogenomic reporting and interpretation](https://github.com/bcgsc/pori).

This is the package which defines the schema logic used to create the database, build the API and GUI.
It is a dependency of both the API and GUI and uses the parser package.

This is where all database constraints and swagger metadata associated with a particular database
model is defined

![schema](https://graphkb-api.bcgsc.ca/public/pori-schema-overview.svg)

## Deployment

This package is installed on our local npm server. To install simply add to your package.json as you
would with any other package and supply the registry argument to npm install


## Getting Started (For Developers)

Install the dependencies

```bash
npm install
```

Then run the tests

```bash
npm run test
```

## Using with OrientJS

To avoid requiring orientjs in this package, the RID class is defaulted to the builtin String class.
It is expected that if you want your RID strings cast to RID objects (orientjs.RID or orientjs.RecordID
for orientjs 3.X.X) that you will patch this after import. For example

```javascript
const {RID} = require('orientjs');
const {constants, schema} = require('@bcgsc-pori/graphkb-schema');

const {PERMISSIONS} = constants;

constants.RID = RID; // IMPORTANT: Without this all castToRID will do is convert to a string
```

## Migrating from v3 to v4

To facilitate more reuseable typing schemes ClassModel and Property classes have been removed and now are simply objects. All interactions with these models should go through the schema class instead of interacting directly with the model and property objects. Return types are given only when they differ.

| v3                                                       | v4 equivalent                                                                                                          | Notes                                                    |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `ClassModel.properties`                                  | `SchemaDefinition.getProperties(modelName: string)`                                                                    |                                                          |
| `ClassModel.required`                                    | `SchemaDefinition.requiredProperties(modelName: string)`                                                               |                                                          |
| `ClassModel.optional`                                    | `SchemaDefinition.optionalProperties(modelName: string)`                                                               |                                                          |
| `ClassModel.getActiveProperties()`                       | `SchemaDefinition.activeProperties(modelName: string)`                                                                 |                                                          |
| `ClassModel.inherits`                                    | `SchemaDefinition.ancestors(modelName: string)`                                                                        |                                                          |
| `ClassModel.subclasses: ClassModel[]`                    | `SchemaDefinition.children(modelName: string): string[]`                                                               |                                                          |
| `ClassModel.descendantTree(boolean): ClassModel[]`       | `SchemaDefinition.descendants(modelName: string, opt: { excludeAbstract?: boolean, includeSelf?: boolean }): string[]` | must be called with includeSelf=true to match v3 edition |
| `ClassModel.queryProperties: Property[]`                 | `SchemaDefinition.queryableProperties(modelName: string): Record<string,PropertyDefinition[]>`                         |                                                          |
| `ClassModel.inheritsProperty(propName: string)`          | `SchemaDefinition.inheritsProperty(modelName: string, propName: string)`                                               |                                                          |
| `ClassModel.toJSON`                                      | N/A                                                                                                                    |                                                          |
| `ClassModel.formatRecord(record: GraphRecord, opt = {})` | `SchemaDefinition.formatRecord(modelName: string, record: GraphRecord, opt = {})`                                      |                                                          |
| `Property.validate(inputValue: unknown): unknown`        | `validateProperty = (prop: PropertyDefinition, inputValue: unknown): unknown`                                          |                                                          |
