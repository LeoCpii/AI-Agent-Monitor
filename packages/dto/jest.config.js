/* eslint-disable */
const { name } = require('./package.json');
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
    displayName: name,
    preset: 'ts-jest/presets/js-with-ts',
    moduleNameMapper: {
        ...pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>/' }),
    },
    testEnvironment: 'jsdom',
    testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
    moduleFileExtensions: ['ts', 'js'],
    modulePathIgnorePatterns: [
        "<rootDir>/dist",
        '.*__mocks__.*'
    ]
};