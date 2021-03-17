import fs from 'fs';
import PythonHandler from '../../../../app/services/assets/handlers/python';

jest.mock('fs');
jest.mock('os');

describe('services', () => {
  describe('PythonHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new PythonHandler().id()).toEqual(`StatWrap.${PythonHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should exclude invalid URIs', () => {
        const handler = new PythonHandler();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile(undefined)).toBeFalsy();
        expect(handler.includeFile('')).toBeFalsy();
        expect(handler.includeFile('   ')).toBeFalsy();
      });

      it('should exclude non-Python files', () => {
        const handler = new PythonHandler();
        expect(handler.includeFile('/User/test/Project/python')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Thumbs.db')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.json')).toBeFalsy();
      });

      it('should exclude where Python extension exists but is not the last', () => {
        const handler = new PythonHandler();
        expect(handler.includeFile('/User/test/Project/python.py.zip')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Processor.py.bak')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.py.py3.pyi.json')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/python.py4')).toBeFalsy();
      });

      it('should exclude extension-only URIs', () => {
        const handler = new PythonHandler();
        expect(handler.includeFile('/User/test/Project/.py')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/  .py')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/.py3')).toBeFalsy();
        expect(handler.includeFile('.pyi')).toBeFalsy();
      });

      it('should include allowable extensions (case insensitive)', () => {
        const handler = new PythonHandler();
        expect(handler.includeFile('/User/test/Project/code/test.py')).toBeTruthy();
        expect(handler.includeFile('/User/test/Project/code/test.Py')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.PY3')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.pY')).toBeTruthy();
        expect(handler.includeFile('mine.pyi')).toBeTruthy();
        expect(handler.includeFile('mine.pyI')).toBeTruthy();
      });

      it('should ignore URLs where the domain could look like the extension', () => {
        const handler = new PythonHandler();
        expect(handler.includeFile('http://test.py')).toBeFalsy();
        expect(handler.includeFile('https://otherTest.PY3.py')).toBeFalsy();
      });

      it('should include URL-based URIs that have parameters', () => {
        const handler = new PythonHandler();
        expect(
          handler.includeFile('http://github.com/test/content/test.py?ref=_1234')
        ).toBeTruthy();
        expect(
          handler.includeFile('https://github.com/test/content/test.py?ref=_1234&test2.py4')
        ).toBeTruthy();
      });
    });

    describe('scan', () => {
      it('should only add the metadata once', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        const handler = new PythonHandler();
        const testAsset = {
          uri: '/Some/Invalid/Path.py',
          type: 'file',
          metadata: [
            {
              id: handler.id()
            }
          ]
        };
        let response = handler.scan(testAsset);
        expect(response.metadata.length).toEqual(1);
        response = handler.scan(response);
        expect(response.metadata.length).toEqual(1);
      });

      it('should return a response with just the handler name if the file cannot be read', () => {
        fs.readFileSync.mockImplementationOnce(() => {
          throw new Error();
        });
        const testAsset = {
          uri: '/Some/Invalid/Path.py',
          type: 'file',
          metadata: []
        };
        const response = new PythonHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.PythonHandler',
          error: 'Unable to read code file'
        });
      });

      it("should skip over assets that aren't a file or directory", () => {
        const testAsset = {
          uri: '/Some/Other/Asset.py',
          type: 'other',
          metadata: []
        };
        const response = new PythonHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(0);
        expect(response.metadata.length).toEqual(0);
      });

      it('should return a response with details for a valid asset', () => {
        fs.readFileSync.mockReturnValue('import sys\nprint("hello world!")');

        const testAsset = {
          uri: '/Some/Valid/File.py',
          type: 'file',
          metadata: []
        };
        const response = new PythonHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.PythonHandler',
          libraries: [
            {
              id: 'sys',
              module: null,
              import: 'sys',
              alias: null
            }
          ]
        });
      });

      it('should handle all nested assets', () => {
        fs.readFileSync
          .mockReturnValueOnce('import sys\nprint("hello world!")')
          .mockReturnValueOnce('print("hello world 2")');

        const testAsset = {
          uri: '/Some/Valid/Folder',
          type: 'directory',
          metadata: [],
          children: [
            {
              uri: '/Some/Valid/Folder/File1.py',
              type: 'file',
              metadata: []
            },
            {
              uri: '/Some/Valid/Folder/SubFolder',
              type: 'directory',
              metadata: [],
              children: [
                {
                  uri: '/Some/Valid/Folder/SubFolder/File2.py',
                  type: 'file',
                  metadata: []
                }
              ]
            }
          ]
        };
        const response = new PythonHandler().scan(testAsset);
        const expectedMetadata1 = {
          id: 'StatWrap.PythonHandler',
          libraries: [
            {
              id: 'sys',
              module: null,
              import: 'sys',
              alias: null
            }
          ]
        };
        const expectedMetadata2 = {
          id: 'StatWrap.PythonHandler',
          libraries: []
        };
        expect(response.metadata.length).toEqual(0);
        expect(response.children[0].metadata.length).toEqual(1);
        expect(response.children[0].metadata[0]).toEqual(expectedMetadata1);
        expect(response.children[1].metadata.length).toEqual(0);
        expect(response.children[1].children[0].metadata[0]).toEqual(expectedMetadata2);
      });
    });

    describe('getLibraries', () => {
      it('should handle empty/blank inputs', () => {
        expect(new PythonHandler().getLibraries('').length).toEqual(0);
        expect(new PythonHandler().getLibraries(null).length).toEqual(0);
        expect(new PythonHandler().getLibraries(undefined).length).toEqual(0);
        expect(new PythonHandler().getLibraries('print("hello world")').length).toEqual(0);
      });
      it('should retrieve package and module names with a list of imports', () => {
        const libraries = new PythonHandler().getLibraries(
          'from importlib.util import spec_from_loader, module_from_spec'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'importlib.util.spec_from_loader, module_from_spec',
          module: 'importlib.util',
          import: 'spec_from_loader, module_from_spec',
          alias: null
        });
      });
      it('should retrieve package and module names with import', () => {
        const libraries = new PythonHandler().getLibraries(
          'from package2.subpackage1.module5 import function2'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'package2.subpackage1.module5.function2',
          module: 'package2.subpackage1.module5',
          import: 'function2',
          alias: null
        });
      });
      it('should retrieve module and import', () => {
        const libraries = new PythonHandler().getLibraries('from abc import xyz');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'abc.xyz',
          module: 'abc',
          import: 'xyz',
          alias: null
        });
      });
      it('should import with alias', () => {
        const libraries = new PythonHandler().getLibraries('import ghi as other_name');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ghi',
          module: null,
          import: 'ghi',
          alias: 'other_name'
        });
      });
      it('should retrieve from a simple import', () => {
        const libraries = new PythonHandler().getLibraries('import sys');
        expect(libraries.length).toEqual(1);
      });
      it('should retrieve multiple libraries', () => {
        const libraries = new PythonHandler().getLibraries(
          'from one import two\nimport three\nimport four as five'
        );
        expect(libraries.length).toEqual(3);
        expect(libraries[0]).toMatchObject({
          id: 'one.two',
          module: 'one',
          import: 'two',
          alias: null
        });
        expect(libraries[1]).toMatchObject({
          id: 'three',
          module: null,
          import: 'three',
          alias: null
        });
        expect(libraries[2]).toMatchObject({
          id: 'four',
          module: null,
          import: 'four',
          alias: 'five'
        });
      });
    });

    describe('getLibraryId', () => {
      it('should return a default label when parameters are missing', () => {
        expect(new PythonHandler().getLibraryId('', '')).toEqual('(unknown)');
        expect(new PythonHandler().getLibraryId(null, null)).toEqual('(unknown)');
        expect(new PythonHandler().getLibraryId(undefined, undefined)).toEqual('(unknown)');
      });
      it('should include import and module name when both provided', () => {
        expect(new PythonHandler().getLibraryId('module', 'import')).toEqual('module.import');
      });
      it('should use the module when it is the only value provided', () => {
        expect(new PythonHandler().getLibraryId('module', '')).toEqual('module');
        expect(new PythonHandler().getLibraryId('module', null)).toEqual('module');
        expect(new PythonHandler().getLibraryId('module', undefined)).toEqual('module');
      });
      it('should use the import when it is the only value provided', () => {
        expect(new PythonHandler().getLibraryId('', 'import')).toEqual('import');
        expect(new PythonHandler().getLibraryId(null, 'import')).toEqual('import');
        expect(new PythonHandler().getLibraryId(undefined, 'import')).toEqual('import');
      });
    });
  });
});
