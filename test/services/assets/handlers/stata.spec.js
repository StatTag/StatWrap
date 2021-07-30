import fs from 'fs';
import StataHandler from '../../../../app/services/assets/handlers/stata';

jest.mock('fs');
jest.mock('os');

describe('services', () => {
  describe('StataHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new StataHandler().id()).toEqual(`StatWrap.${StataHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should exclude invalid URIs', () => {
        const handler = new StataHandler();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile(undefined)).toBeFalsy();
        expect(handler.includeFile('')).toBeFalsy();
        expect(handler.includeFile('   ')).toBeFalsy();
      });

      it('should exclude non-Stata files', () => {
        const handler = new StataHandler();
        expect(handler.includeFile('/User/test/Project/stata')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Thumbs.db')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.json')).toBeFalsy();
      });

      it('should exclude where Stata extension exists but is not the last', () => {
        const handler = new StataHandler();
        expect(handler.includeFile('/User/test/Project/r.do.zip')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Processor.do.bak')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.do.r3.ri.json')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/do.r4')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/test.adoz')).toBeFalsy();
      });

      it('should exclude extension-only URIs', () => {
        const handler = new StataHandler();
        expect(handler.includeFile('/User/test/Project/.do')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/  .do')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/.ado')).toBeFalsy();
      });

      it('should include allowable extensions (case insensitive)', () => {
        const handler = new StataHandler();
        expect(handler.includeFile('/User/test/Project/code/test.do')).toBeTruthy();
        expect(handler.includeFile('/User/test/Project/code/test.DO')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.ADO')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.aDo')).toBeTruthy();
        expect(handler.includeFile('mine.DO')).toBeTruthy();
        expect(handler.includeFile('mine.ado')).toBeTruthy();
      });

      it('should ignore URLs where the domain could look like the extension', () => {
        const handler = new StataHandler();
        expect(handler.includeFile('http://test.do')).toBeFalsy();
        expect(handler.includeFile('https://otherTest.Ado.do')).toBeFalsy();
        expect(handler.includeFile('https://otherTest.do.ado')).toBeFalsy();
      });

      it('should include URL-based URIs that have parameters', () => {
        const handler = new StataHandler();
        expect(
          handler.includeFile('http://github.com/test/content/test.do?ref=_1234')
        ).toBeTruthy();
        expect(
          handler.includeFile('https://github.com/test/content/test.do?ref=_1234&test2.ado')
        ).toBeTruthy();
      });
    });

    describe('scan', () => {
      it('should only add the metadata once', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        const handler = new StataHandler();
        const testAsset = {
          uri: '/Some/Invalid/Path.do',
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
          uri: '/Some/Invalid/Path.do',
          type: 'file',
          metadata: []
        };
        const response = new StataHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.StataHandler',
          error: 'Unable to read code file'
        });
      });

      it("should skip over assets that aren't a file or directory", () => {
        const testAsset = {
          uri: '/Some/Other/Asset.do',
          type: 'other',
          metadata: []
        };
        const response = new StataHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(0);
        expect(response.metadata.length).toEqual(0);
      });

      it('should return a response with details for a valid asset', () => {
        fs.readFileSync.mockReturnValue('do test');

        const testAsset = {
          uri: '/Some/Valid/File.do',
          type: 'file',
          metadata: []
        };
        const response = new StataHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.StataHandler',
          libraries: [
            {
              id: 'test',
              package: 'test'
            }
          ]
        });
      });

      it('should handle all nested assets', () => {
        fs.readFileSync
          .mockReturnValueOnce('do test')
          .mockReturnValueOnce('print("hello world 2")');

        const testAsset = {
          uri: '/Some/Valid/Folder',
          type: 'directory',
          metadata: [],
          children: [
            {
              uri: '/Some/Valid/Folder/File1.do',
              type: 'file',
              metadata: []
            },
            {
              uri: '/Some/Valid/Folder/SubFolder',
              type: 'directory',
              metadata: [],
              children: [
                {
                  uri: '/Some/Valid/Folder/SubFolder/File2.ado',
                  type: 'file',
                  metadata: []
                }
              ]
            }
          ]
        };
        const response = new StataHandler().scan(testAsset);
        const expectedMetadata1 = {
          id: 'StatWrap.StataHandler',
          libraries: [
            {
              id: 'test',
              package: 'test'
            }
          ]
        };
        const expectedMetadata2 = {
          id: 'StatWrap.StataHandler',
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
        expect(new StataHandler().getLibraries('').length).toEqual(0);
        expect(new StataHandler().getLibraries(null).length).toEqual(0);
        expect(new StataHandler().getLibraries(undefined).length).toEqual(0);
        expect(new StataHandler().getLibraries('print("hello world")').length).toEqual(0);
      });
      it('should process do/run statements', () => {
        let libraries = new StataHandler().getLibraries('do test');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries('run test.do');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do'
        });

        libraries = new StataHandler().getLibraries('ru test');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries('ru test.do, nostop ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do'
        });
      });
      it('ignore invalid do/run commands', () => {
        expect(new StataHandler().getLibraries('dot test').length).toEqual(0);
        expect(new StataHandler().getLibraries('dotest').length).toEqual(0);
        expect(new StataHandler().getLibraries('run test, nosto').length).toEqual(0);
        expect(new StataHandler().getLibraries('r test, nostop').length).toEqual(0);
      });
      it('should process quoted files in do/run statements', () => {
        let libraries = new StataHandler().getLibraries('do "test file"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test file',
          package: 'test file'
        });

        libraries = new StataHandler().getLibraries('run "test.do"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do'
        });

        libraries = new StataHandler().getLibraries('ru "test"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries('ru "test.do", nostop ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do'
        });
      });
      it('ignore invalid quoted do/run commands', () => {
        expect(new StataHandler().getLibraries('dot "test"').length).toEqual(0);
        expect(new StataHandler().getLibraries('do"test"').length).toEqual(0);
        expect(new StataHandler().getLibraries('run "test", nosto').length).toEqual(0);
        expect(new StataHandler().getLibraries('r "test", nostop').length).toEqual(0);
        expect(new StataHandler().getLibraries('do "test').length).toEqual(0);
        expect(new StataHandler().getLibraries('do test"').length).toEqual(0);
      });
      it('should process program plugin commands', () => {
        let libraries = new StataHandler().getLibraries('program test, plugin');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries('pr  test, plug');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries(' program  test , plugin ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries(
          'program test, plugin using("/test/location.dll")'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test (/test/location.dll)',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries('pr test, plug using("/test/location.dll")');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test (/test/location.dll)',
          package: 'test'
        });

        libraries = new StataHandler().getLibraries(
          'program test , plugin using ( "/test/location.dll" ) '
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test (/test/location.dll)',
          package: 'test'
        });
      });
      it('ignore invalid program/plugin commands', () => {
        expect(new StataHandler().getLibraries('program test plugin').length).toEqual(0);
        expect(new StataHandler().getLibraries('prtest,plug').length).toEqual(0);
        expect(new StataHandler().getLibraries('program     plugin').length).toEqual(0);
        expect(
          new StataHandler().getLibraries('program test, plugin using(/test/location.dll")').length
        ).toEqual(0);
        expect(
          new StataHandler().getLibraries('program test, plugin using("/test/location.dll)').length
        ).toEqual(0);
        expect(new StataHandler().getLibraries('program test , plugin usi(ng)').length).toEqual(0);
      });
    });

    describe('getLibraryId', () => {
      it('should return a default label when parameter is missing', () => {
        expect(new StataHandler().getLibraryId('')).toEqual('(unknown)');
        expect(new StataHandler().getLibraryId(null)).toEqual('(unknown)');
        expect(new StataHandler().getLibraryId(undefined)).toEqual('(unknown)');
      });
      it('should include package name when provided', () => {
        expect(new StataHandler().getLibraryId('testlib')).toEqual('testlib');
      });
      it('should include location and package name when provided', () => {
        expect(new StataHandler().getLibraryId('testlib', '/test/file/location.dll')).toEqual(
          'testlib (/test/file/location.dll)'
        );
      });
    });

    describe('getOutputs', () => {
      it('should handle empty/blank inputs', () => {
        expect(new StataHandler().getOutputs('').length).toEqual(0);
        expect(new StataHandler().getOutputs(null).length).toEqual(0);
        expect(new StataHandler().getOutputs(undefined).length).toEqual(0);
        expect(new StataHandler().getOutputs('display x').length).toEqual(0);
      });
      it('should retrieve save locations for figures', () => {
        let libraries = new StataHandler().getOutputs('graph export "C:\\dev\\test.pdf"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'graph export - "C:\\dev\\test.pdf"',
          type: 'figure',
          path: '"C:\\dev\\test.pdf"'
        });
        libraries = new StataHandler().getOutputs('graph export test.pdf, as(pdf) replace');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'graph export - test.pdf',
          type: 'figure',
          path: 'test.pdf'
        });
        libraries = new StataHandler().getOutputs(
          ' gr export "C:\\Stats\\test.pdf" , as(pdf) replace '
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'gr export - "C:\\Stats\\test.pdf"',
          type: 'figure',
          path: '"C:\\Stats\\test.pdf"'
        });
      });
      it('should ignore save locations for figures when command case mismatches', () => {
        const libraries = new StataHandler().getOutputs('Graph Export "test.pdf"');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented figure save locations', () => {
        expect(new StataHandler().getOutputs('#graph export "test.pdf"').length).toEqual(0);
        expect(new StataHandler().getOutputs(' #graph export "test.pdf"').length).toEqual(0);
        expect(new StataHandler().getOutputs('  #  graph export "test.pdf"').length).toEqual(0);
      });
      it('should handle multiple figure outputs in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'graph export "c:\\dev\\test.pdf"\r\n di x \r\n graph export test.pdf, as(pdf) replace\r\r gr export "C:\\Stats\\test.pdf" , as(pdf) replace  \r\n di y '
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for logs', () => {
        let libraries = new StataHandler().getOutputs('cmdlog using C:\\dev\\test.log');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'cmdlog - C:\\dev\\test.log',
          type: 'log',
          path: 'C:\\dev\\test.log'
        });
        libraries = new StataHandler().getOutputs('cmdlog using "tmp.log"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'cmdlog - "tmp.log"',
          type: 'log',
          path: '"tmp.log"'
        });
        libraries = new StataHandler().getOutputs(' log   using    tmp2.log  ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'log - tmp2.log',
          type: 'log',
          path: 'tmp2.log'
        });
      });
      it('should ignore save locations for logs when command case mismatches', () => {
        const libraries = new StataHandler().getOutputs('Cmd Log Using "test.log"');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented log save locations', () => {
        expect(new StataHandler().getOutputs('#cmdlog using "tmp.log"').length).toEqual(0);
        expect(new StataHandler().getOutputs(' #cmdlog using "tmp.log"').length).toEqual(0);
        expect(new StataHandler().getOutputs('   #  cmdlog using "tmp.log"').length).toEqual(0);
      });
      it('should handle multiple log outputs in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'cmdlog using C:\\dev\\test.log\r\n di x \r\n cmdlog using "tmp.log"\r\r log   using    tmp2.log  \r\n di y '
        );
        expect(libraries.length).toEqual(3);
      });
    });
  });
});
