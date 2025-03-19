import fs from 'fs';
import JavaHandler from '../../../../app/services/assets/handlers/java';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('JavaHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new JavaHandler().id()).toEqual(`StatWrap.${JavaHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include Java files and exclude others', () => {
        const handler = new JavaHandler();
        // Valid files
        expect(handler.includeFile('/path/to/Test.java')).toBeTruthy();
        expect(handler.includeFile('/path/to/Main.JAVA')).toBeTruthy();

        // Invalid files
        expect(handler.includeFile('/path/to/Test.class')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.jar')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile('/path/to/Test.java.bak')).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should extract import statements', () => {
        const libraries = new JavaHandler().getLibraries(
          'test.uri',
          'import java.util.List;\nimport java.io.File;'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'java.util.List',
          module: 'java.util',
          import: 'List',
          alias: null,
        });
        expect(libraries[1]).toMatchObject({
          id: 'java.io.File',
          module: 'java.io',
          import: 'File',
          alias: null,
        });
      });
    });

    describe('getInputs', () => {
      it('should detect file read operations', () => {
        const inputs = new JavaHandler().getInputs(
          'test.uri',
          'FileInputStream fis = new FileInputStream("input.txt");'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'FileInputStream - "input.txt"',
          type: 'data',
          path: '"input.txt"',
        });
      });
    });

    describe('getOutputs', () => {
      it('should detect file write operations', () => {
        const outputs = new JavaHandler().getOutputs(
          'test.uri',
          'FileOutputStream fos = new FileOutputStream("output.txt");'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'FileOutputStream - "output.txt"',
          type: 'data',
          path: '"output.txt"',
        });
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Java file', () => {
        fs.readFileSync.mockReturnValue('import java.util.List;\npublic class Test {}');

        const testAsset = {
          uri: '/path/to/Test.java',
          type: 'file',
          metadata: [],
        };

        const response = new JavaHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.JavaHandler',
          libraries: [
            {
              id: 'java.util.List',
              module: 'java.util',
              import: 'List',
            }
          ]
        });
      });
    });
  });
});
