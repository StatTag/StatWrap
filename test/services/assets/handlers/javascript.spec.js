import fs from 'fs';
import JavaScriptHandler from '../../../../app/services/assets/handlers/javascript';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('JavaScriptHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new JavaScriptHandler().id()).toEqual(`StatWrap.${JavaScriptHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include JS files and exclude others', () => {
        const handler = new JavaScriptHandler();
        expect(handler.includeFile('/path/to/app.js')).toBeTruthy();
        expect(handler.includeFile('/path/to/component.jsx')).toBeTruthy();
        expect(handler.includeFile('/path/to/module.mjs')).toBeTruthy();
        expect(handler.includeFile('/path/to/module.cjs')).toBeTruthy();
        expect(handler.includeFile('/path/to/app.ts')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.py')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should return empty array for empty text', () => {
        expect(new JavaScriptHandler().getLibraries('test.uri', '')).toEqual([]);
        expect(new JavaScriptHandler().getLibraries('test.uri', null)).toEqual([]);
      });

      it('should detect default ES module imports', () => {
        const libraries = new JavaScriptHandler().getLibraries(
          'test.uri',
          "import React from 'react';"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'react',
          import: 'React',
        });
      });

      it('should detect named ES module imports', () => {
        const libraries = new JavaScriptHandler().getLibraries(
          'test.uri',
          "import { readFileSync } from 'fs';"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'fs',
          import: '{ readFileSync }',
        });
      });

      it('should detect namespace ES module imports', () => {
        const libraries = new JavaScriptHandler().getLibraries(
          'test.uri',
          "import * as path from 'path';"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'path',
        });
      });

      it('should detect CommonJS require', () => {
        const libraries = new JavaScriptHandler().getLibraries(
          'test.uri',
          "const fs = require('fs');"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'fs',
        });
      });

      it('should detect destructured require', () => {
        const libraries = new JavaScriptHandler().getLibraries(
          'test.uri',
          "const { join, resolve } = require('path');"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'path',
        });
      });

      it('should detect ES module imports using double quotes', () => {
        const libraries = new JavaScriptHandler().getLibraries(
          'test.uri',
          'import { readFile, writeFile } from "fs/promises";'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'fs/promises',
          import: '{ readFile, writeFile }',
        });
      });

      it('should detect CommonJS require using double quotes', () => {
        const libraries = new JavaScriptHandler().getLibraries(
          'test.uri',
          'const path = require("path");'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'path',
        });
      });
    });

    describe('getInputs', () => {
      it('should return empty array for empty text', () => {
        expect(new JavaScriptHandler().getInputs('test.uri', '')).toEqual([]);
        expect(new JavaScriptHandler().getInputs('test.uri', null)).toEqual([]);
      });

      it('should detect fs.readFileSync', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          "const data = fs.readFileSync('input.csv', 'utf8');"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: "readFile - 'input.csv'",
          type: Constants.DependencyType.DATA,
          path: "'input.csv'",
        });
      });

      it('should detect fs.readFile', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          "fs.readFile('data.json', callback);"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect fs.createReadStream', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          "const stream = fs.createReadStream('input.csv');"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: "createReadStream - 'input.csv'",
          type: Constants.DependencyType.DATA,
        });
      });

      it('should not duplicate the same path', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          "fs.readFileSync('data.csv');\nfs.readFileSync('data.csv');"
        );
        expect(inputs.length).toEqual(1);
      });

      it('should detect paths using double quotes', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          'const data = fs.readFileSync("input.csv", "utf8");'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'readFile - "input.csv"',
          type: Constants.DependencyType.DATA,
          path: '"input.csv"',
        });
      });

      it('should detect fully qualified Linux/Mac paths', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          "fs.readFileSync('/home/user/data/test.csv', 'utf8');"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
          path: "'/home/user/data/test.csv'",
        });
      });

      it('should detect fully qualified Windows paths', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          "fs.readFileSync('C:\\\\Users\\\\user\\\\data\\\\test.csv', 'utf8');"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect relative paths', () => {
        const inputs = new JavaScriptHandler().getInputs(
          'test.uri',
          "fs.readFileSync('data/test.csv');\nfs.readFileSync('../data/test.csv');"
        );
        expect(inputs.length).toEqual(2);
        expect(inputs[0]).toMatchObject({ path: "'data/test.csv'" });
        expect(inputs[1]).toMatchObject({ path: "'../data/test.csv'" });
      });
    });

    describe('getOutputs', () => {
      it('should return empty array for empty text', () => {
        expect(new JavaScriptHandler().getOutputs('test.uri', '')).toEqual([]);
        expect(new JavaScriptHandler().getOutputs('test.uri', null)).toEqual([]);
      });

      it('should detect fs.writeFileSync', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "fs.writeFileSync('output.csv', data);"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: "writeFile - 'output.csv'",
          type: Constants.DependencyType.DATA,
          path: "'output.csv'",
        });
      });

      it('should detect fs.writeFile', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "fs.writeFile('result.json', data, callback);"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect fs.appendFile and fs.appendFileSync', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "fs.appendFile('log.txt', entry, callback);\nfs.appendFileSync('log2.txt', entry);"
        );
        expect(outputs.length).toEqual(2);
      });

      it('should detect fs.createWriteStream', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "const stream = fs.createWriteStream('output.csv');"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: "createWriteStream - 'output.csv'",
          type: Constants.DependencyType.DATA,
        });
      });

      it('should not duplicate the same path', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "fs.writeFileSync('out.csv', data);\nfs.writeFileSync('out.csv', data);"
        );
        expect(outputs.length).toEqual(1);
      });

      it('should detect paths using double quotes', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          'fs.writeFileSync("output.csv", data);'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'writeFile - "output.csv"',
          type: Constants.DependencyType.DATA,
          path: '"output.csv"',
        });
      });

      it('should detect fully qualified Linux/Mac paths', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "fs.writeFileSync('/home/user/results/output.csv', data);"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
          path: "'/home/user/results/output.csv'",
        });
      });

      it('should detect fully qualified Windows paths', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "fs.writeFileSync('C:\\\\Users\\\\user\\\\results\\\\output.csv', data);"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect relative paths', () => {
        const outputs = new JavaScriptHandler().getOutputs(
          'test.uri',
          "fs.writeFileSync('results/output.csv', data);\nfs.writeFileSync('../results/output.csv', data);"
        );
        expect(outputs.length).toEqual(2);
        expect(outputs[0]).toMatchObject({ path: "'results/output.csv'" });
        expect(outputs[1]).toMatchObject({ path: "'../results/output.csv'" });
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid JS file', () => {
        fs.readFileSync.mockReturnValue(
          "const fs = require('fs');\nconst data = fs.readFileSync('input.csv', 'utf8');"
        );
        const testAsset = {
          uri: '/path/to/script.js',
          type: 'file',
          metadata: [],
        };
        const response = new JavaScriptHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.JavaScriptHandler',
          libraries: [{ module: 'fs' }],
          inputs: [{ type: Constants.DependencyType.DATA }],
        });
      });
    });
  });
});
