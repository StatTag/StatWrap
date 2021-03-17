import fs from 'fs';
import RHandler from '../../../../app/services/assets/handlers/r';

jest.mock('fs');
jest.mock('os');

describe('services', () => {
  describe('RHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new RHandler().id()).toEqual(`StatWrap.${RHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should exclude invalid URIs', () => {
        const handler = new RHandler();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile(undefined)).toBeFalsy();
        expect(handler.includeFile('')).toBeFalsy();
        expect(handler.includeFile('   ')).toBeFalsy();
      });

      it('should exclude non-R files', () => {
        const handler = new RHandler();
        expect(handler.includeFile('/User/test/Project/r')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Thumbs.db')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.json')).toBeFalsy();
      });

      it('should exclude where R extension exists but is not the last', () => {
        const handler = new RHandler();
        expect(handler.includeFile('/User/test/Project/r.r.zip')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Processor.r.bak')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.r.r3.ri.json')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/r.r4')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/test.Rmdz')).toBeFalsy();
      });

      it('should exclude extension-only URIs', () => {
        const handler = new RHandler();
        expect(handler.includeFile('/User/test/Project/.r')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/  .r')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/.r3')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/.rmd')).toBeFalsy();
        expect(handler.includeFile('.ri')).toBeFalsy();
      });

      it('should include allowable extensions (case insensitive)', () => {
        const handler = new RHandler();
        expect(handler.includeFile('/User/test/Project/code/test.r')).toBeTruthy();
        expect(handler.includeFile('/User/test/Project/code/test.R')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.RMD')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.rMd')).toBeTruthy();
        expect(handler.includeFile('mine.R')).toBeTruthy();
        expect(handler.includeFile('mine.r')).toBeTruthy();
      });

      it('should ignore URLs where the domain could look like the extension', () => {
        const handler = new RHandler();
        expect(handler.includeFile('http://test.r')).toBeFalsy();
        expect(handler.includeFile('https://otherTest.Rmd.r')).toBeFalsy();
        expect(handler.includeFile('https://otherTest.r.rmd')).toBeFalsy();
      });

      it('should include URL-based URIs that have parameters', () => {
        const handler = new RHandler();
        expect(handler.includeFile('http://github.com/test/content/test.r?ref=_1234')).toBeTruthy();
        expect(
          handler.includeFile('https://github.com/test/content/test.r?ref=_1234&test2.rmd')
        ).toBeTruthy();
      });
    });

    describe('scan', () => {
      it('should only add the metadata once', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        const handler = new RHandler();
        const testAsset = {
          uri: '/Some/Invalid/Path.r',
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
          uri: '/Some/Invalid/Path.r',
          type: 'file',
          metadata: []
        };
        const response = new RHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.RHandler',
          error: 'Unable to read code file'
        });
      });

      it("should skip over assets that aren't a file or directory", () => {
        const testAsset = {
          uri: '/Some/Other/Asset.r',
          type: 'other',
          metadata: []
        };
        const response = new RHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(0);
        expect(response.metadata.length).toEqual(0);
      });

      it('should return a response with details for a valid asset', () => {
        fs.readFileSync.mockReturnValue('library(base)\nprint("hello world!")');

        const testAsset = {
          uri: '/Some/Valid/File.r',
          type: 'file',
          metadata: []
        };
        const response = new RHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.RHandler',
          libraries: [
            {
              id: 'base',
              package: 'base'
            }
          ]
        });
      });

      it('should handle all nested assets', () => {
        fs.readFileSync
          .mockReturnValueOnce('library(base)\nprint("hello world!")')
          .mockReturnValueOnce('print("hello world 2")');

        const testAsset = {
          uri: '/Some/Valid/Folder',
          type: 'directory',
          metadata: [],
          children: [
            {
              uri: '/Some/Valid/Folder/File1.r',
              type: 'file',
              metadata: []
            },
            {
              uri: '/Some/Valid/Folder/SubFolder',
              type: 'directory',
              metadata: [],
              children: [
                {
                  uri: '/Some/Valid/Folder/SubFolder/File2.r',
                  type: 'file',
                  metadata: []
                }
              ]
            }
          ]
        };
        const response = new RHandler().scan(testAsset);
        const expectedMetadata1 = {
          id: 'StatWrap.RHandler',
          libraries: [
            {
              id: 'base',
              package: 'base'
            }
          ]
        };
        const expectedMetadata2 = {
          id: 'StatWrap.RHandler',
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
        expect(new RHandler().getLibraries('').length).toEqual(0);
        expect(new RHandler().getLibraries(null).length).toEqual(0);
        expect(new RHandler().getLibraries(undefined).length).toEqual(0);
        expect(new RHandler().getLibraries('print("hello world")').length).toEqual(0);
      });
      it('should retrieve unoquoted package', () => {
        const libraries = new RHandler().getLibraries('library(test)');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });
      });
      it('should retrieve single quoted package', () => {
        const libraries = new RHandler().getLibraries("library('test')");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });
      });
      it('should retrieve double quoted package', () => {
        const libraries = new RHandler().getLibraries('library("test")');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });
      });
      it('should retrieve package name without extra whitespace', () => {
        expect(new RHandler().getLibraries(" library ( 'test' ) ")[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });
        expect(new RHandler().getLibraries("\t\tlibrary\t(\t'test'\t)\t\n")[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });
      });
      it('should ignore empty library() calls', () => {
        expect(new RHandler().getLibraries('library()').length).toEqual(0);
        expect(new RHandler().getLibraries(' library ( ) ').length).toEqual(0);
      });
      it('should retrieve multiple libraries', () => {
        const libraries = new RHandler().getLibraries('library(one)\nrequire(two)\nlibrary(three)');
        expect(libraries.length).toEqual(3);
        expect(libraries[0]).toMatchObject({
          id: 'one',
          package: 'one'
        });
        expect(libraries[1]).toMatchObject({
          id: 'two',
          package: 'two'
        });
        expect(libraries[2]).toMatchObject({
          id: 'three',
          package: 'three'
        });
      });
    });

    describe('getLibraryId', () => {
      it('should return a default label when parameter is missing', () => {
        expect(new RHandler().getLibraryId('')).toEqual('(unknown)');
        expect(new RHandler().getLibraryId(null)).toEqual('(unknown)');
        expect(new RHandler().getLibraryId(undefined)).toEqual('(unknown)');
      });
      it('should include package name when provided', () => {
        expect(new RHandler().getLibraryId('testlib')).toEqual('testlib');
      });
    });
  });
});
