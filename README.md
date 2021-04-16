# GraphKB Schema

[![codecov](https://codecov.io/gh/bcgsc/pori_graphkb_schema/branch/master/graph/badge.svg?token=0QZTY7RA1R)](https://codecov.io/gh/bcgsc/pori_graphkb_schema) ![build](https://github.com/bcgsc/pori_graphkb_schema/workflows/build/badge.svg?branch=master) [![npm version](https://badge.fury.io/js/%40bcgsc-pori%2Fgraphkb-schema.svg)](https://badge.fury.io/js/%40bcgsc-pori%2Fgraphkb-schema) ![node versions](https://img.shields.io/badge/node-10%20%7C%2012%20%7C%2014-blue)

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
const {constants, schema: SCHEMA_DEFN} = require('@bcgsc-pori/graphkb-schema');

const {PERMISSIONS} = constants;

constants.RID = RID; // IMPORTANT: Without this all castToRID will do is convert to a string
```
