// main jest configuration file
const path = require('path');

const BASE_DIR = path.resolve(__dirname, '..');

module.exports = {
    preset: 'ts-jest',
    rootDir: BASE_DIR,
    collectCoverage: true,
    coverageDirectory: 'coverage',
    collectCoverageFrom: [
        'src/**.ts',
        'src/**/*.ts',
        'src/**/**/*.ts',
    ],
    coverageReporters: [
        'clover',
        'text',
        'json',
        'json-summary',
        'lcov',
    ],
    reporters: [
        'default',
        [
            'jest-junit',
            {
                outputDirectory: '<rootDir>/coverage',
            },
        ],
    ],
    testRunner: 'jest-circus/runner',
    testRegex: 'test/.*\\.test\\.ts',
    testEnvironment: 'node',
    testPathIgnorePatterns: [
        '/node_modules/',
    ],
    moduleFileExtensions: [
        'js',
        'ts',
        'json',
    ],
};
