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
          handler.includeFile('http://github.com/test/content/test.do?ref=_1234'),
        ).toBeTruthy();
        expect(
          handler.includeFile('https://github.com/test/content/test.do?ref=_1234&test2.ado'),
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
              id: handler.id(),
            },
          ],
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
          metadata: [],
        };
        const response = new StataHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.StataHandler',
          error: 'Unable to read code file',
        });
      });

      it("should skip over assets that aren't a file or directory", () => {
        const testAsset = {
          uri: '/Some/Other/Asset.do',
          type: 'other',
          metadata: [],
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
          metadata: [],
        };
        const response = new StataHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.StataHandler',
          libraries: [
            {
              id: 'test',
              package: 'test',
            },
          ],
          inputs: [],
          outputs: [],
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
              metadata: [],
            },
            {
              uri: '/Some/Valid/Folder/SubFolder',
              type: 'directory',
              metadata: [],
              children: [
                {
                  uri: '/Some/Valid/Folder/SubFolder/File2.ado',
                  type: 'file',
                  metadata: [],
                },
              ],
            },
          ],
        };
        const response = new StataHandler().scan(testAsset);
        const expectedMetadata1 = {
          id: 'StatWrap.StataHandler',
          libraries: [
            {
              id: 'test',
              package: 'test',
            },
          ],
          inputs: [],
          outputs: [],
        };
        const expectedMetadata2 = {
          id: 'StatWrap.StataHandler',
          libraries: [],
          inputs: [],
          outputs: [],
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
        expect(new StataHandler().getLibraries('test.uri', '').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', null).length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', undefined).length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'print("hello world")').length).toEqual(
          0,
        );
      });
      it('should process do/run statements', () => {
        let libraries = new StataHandler().getLibraries('test.uri', 'do test');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries('test.uri', 'run test.do');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do',
        });

        libraries = new StataHandler().getLibraries('test.uri', 'ru test');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries('test.uri', 'ru test.do, nostop ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do',
        });
      });
      it('ignore invalid do/run commands', () => {
        expect(new StataHandler().getLibraries('test.uri', 'dot test').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'dotest').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'run test, nosto').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'r test, nostop').length).toEqual(0);
      });
      it('should process quoted files in do/run statements', () => {
        let libraries = new StataHandler().getLibraries('test.uri', 'do "test file"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test file',
          package: 'test file',
        });

        libraries = new StataHandler().getLibraries('test.uri', 'run "test.do"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do',
        });

        libraries = new StataHandler().getLibraries('test.uri', 'ru "test"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries('test.uri', 'ru "test.do", nostop ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.do',
          package: 'test.do',
        });
      });
      it('ignore invalid quoted do/run commands', () => {
        expect(new StataHandler().getLibraries('test.uri', 'dot "test"').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'do"test"').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'run "test", nosto').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'r "test", nostop').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'do "test').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'do test"').length).toEqual(0);
      });
      it('should process program plugin commands', () => {
        let libraries = new StataHandler().getLibraries('test.uri', 'program test, plugin');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries('test.uri', 'pr  test, plug');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries('test.uri', ' program  test , plugin ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries(
          'test.uri',
          'program test, plugin using("/test/location.dll")',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test (/test/location.dll)',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries(
          'test.uri',
          'pr test, plug using("/test/location.dll")',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test (/test/location.dll)',
          package: 'test',
        });

        libraries = new StataHandler().getLibraries(
          'test.uri',
          'program test , plugin using ( "/test/location.dll" ) ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test (/test/location.dll)',
          package: 'test',
        });
      });
      it('ignore invalid program/plugin commands', () => {
        expect(new StataHandler().getLibraries('test.uri', 'program test plugin').length).toEqual(
          0,
        );
        expect(new StataHandler().getLibraries('test.uri', 'prtest,plug').length).toEqual(0);
        expect(new StataHandler().getLibraries('test.uri', 'program     plugin').length).toEqual(0);
        expect(
          new StataHandler().getLibraries(
            'test.uri',
            'program test, plugin using(/test/location.dll")',
          ).length,
        ).toEqual(0);
        expect(
          new StataHandler().getLibraries(
            'test.uri',
            'program test, plugin using("/test/location.dll)',
          ).length,
        ).toEqual(0);
        expect(
          new StataHandler().getLibraries('test.uri', 'program test , plugin usi(ng)').length,
        ).toEqual(0);
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
          'testlib (/test/file/location.dll)',
        );
      });
    });

    describe('getOutputs', () => {
      it('should handle empty/blank inputs', () => {
        expect(new StataHandler().getOutputs('test.uri', '').length).toEqual(0);
        expect(new StataHandler().getOutputs('test.uri', null).length).toEqual(0);
        expect(new StataHandler().getOutputs('test.uri', undefined).length).toEqual(0);
        expect(new StataHandler().getOutputs('test.uri', 'display x').length).toEqual(0);
      });
      it('should retrieve save locations for figures', () => {
        let libraries = new StataHandler().getOutputs(
          'test.uri',
          'graph export "C:\\dev\\test.pdf"',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'graph export - "C:\\dev\\test.pdf"',
          type: 'figure',
          path: '"C:\\dev\\test.pdf"',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          'graph export test.pdf, as(pdf) replace',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'graph export - test.pdf',
          type: 'figure',
          path: 'test.pdf',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          ' gr export "C:\\Stats\\test.pdf" , as(pdf) replace ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'gr export - "C:\\Stats\\test.pdf"',
          type: 'figure',
          path: '"C:\\Stats\\test.pdf"',
        });
      });
      it('should ignore save locations for figures when command case mismatches', () => {
        const libraries = new StataHandler().getOutputs('test.uri', 'Graph Export "test.pdf"');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented figure save locations', () => {
        expect(
          new StataHandler().getOutputs('test.uri', '#graph export "test.pdf"').length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs('test.uri', ' #graph export "test.pdf"').length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs('test.uri', '  #  graph export "test.pdf"').length,
        ).toEqual(0);
      });
      it('should handle multiple figure outputs in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'test.uri',
          'graph export "c:\\dev\\test.pdf"\r\n di x \r\n graph export test.pdf, as(pdf) replace\r\r gr export "C:\\Stats\\test.pdf" , as(pdf) replace  \r\n di y ',
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for logs', () => {
        let libraries = new StataHandler().getOutputs('test.uri', 'cmdlog using C:\\dev\\test.log');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'cmdlog - C:\\dev\\test.log',
          type: 'log',
          path: 'C:\\dev\\test.log',
        });
        libraries = new StataHandler().getOutputs('test.uri', 'cmdlog using "tmp.log"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'cmdlog - "tmp.log"',
          type: 'log',
          path: '"tmp.log"',
        });
        libraries = new StataHandler().getOutputs('test.uri', ' log   using    tmp2.log  ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'log - tmp2.log',
          type: 'log',
          path: 'tmp2.log',
        });
      });
      it('should ignore save locations for logs when command case mismatches', () => {
        const libraries = new StataHandler().getOutputs('test.uri', 'Cmd Log Using "test.log"');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented log save locations', () => {
        expect(new StataHandler().getOutputs('test.uri', '#cmdlog using "tmp.log"').length).toEqual(
          0,
        );
        expect(
          new StataHandler().getOutputs('test.uri', ' #cmdlog using "tmp.log"').length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs('test.uri', '   #  cmdlog using "tmp.log"').length,
        ).toEqual(0);
      });
      it('should handle multiple log outputs in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'test.uri',
          'cmdlog using C:\\dev\\test.log\r\n di x \r\n cmdlog using "tmp.log"\r\r log   using    tmp2.log  \r\n di y ',
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for export commands', () => {
        let libraries = new StataHandler().getOutputs('test.uri', 'export excel mydata ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'export excel - mydata',
          type: 'data',
          path: 'mydata',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          'export delimited v1 v2 v3 using "mydata.txt"',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'export delimited - "mydata.txt"',
          type: 'data',
          path: '"mydata.txt"',
        });
        libraries = new StataHandler().getOutputs('test.uri', ' outfile using mydata, wide ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'outfile - mydata',
          type: 'data',
          path: 'mydata',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          ' export sasxport8  mydata  ,  replace  ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'export sasxport8 - mydata',
          type: 'data',
          path: 'mydata',
        });
        libraries = new StataHandler().getOutputs('test.uri', 'export dbase "C:\\test\\test.db"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'export dbase - "C:\\test\\test.db"',
          type: 'data',
          path: '"C:\\test\\test.db"',
        });
        libraries = new StataHandler().getOutputs('test.uri', 'xmlsave "/Users/test/test.xml"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'xmlsave - "/Users/test/test.xml"',
          type: 'data',
          path: '"/Users/test/test.xml"',
        });
      });
      it('should ignore save locations for export when command case mismatches', () => {
        const libraries = new StataHandler().getOutputs('test.uri', 'Outfile using mydata, wide');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented export save locations', () => {
        expect(
          new StataHandler().getOutputs('test.uri', '#outfile using mydata, wide').length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs('test.uri', ' #outfile using mydata, wide').length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs('test.uri', '  # outfile using mydata, wide ').length,
        ).toEqual(0);
      });
      it('should handle multiple export outputs in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'test.uri',
          'export delimited v1 v2 v3 using "mydata.txt"\r\n  export sasxport8  mydata  ,  replace  \r\n di x \r\n Outfile using mydata, wide  \r\n    export dbase "C:\\test\\test.db"',
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for put* commands', () => {
        let libraries = new StataHandler().getOutputs('test.uri', "putdocx save 'test', replace");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "putdocx - 'test'",
          type: 'data',
          path: "'test'",
        });
        libraries = new StataHandler().getOutputs('test.uri', 'putpdf save example.pdf');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'putpdf - example.pdf',
          type: 'data',
          path: 'example.pdf',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          ' putexcel  save  "C:\\Documents\\test.xlsx" ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'putexcel - "C:\\Documents\\test.xlsx"',
          type: 'data',
          path: '"C:\\Documents\\test.xlsx"',
        });
      });
      it('should ignore save locations for put* when command case mismatches', () => {
        const libraries = new StataHandler().getOutputs('test.uri', 'PutPdf save example.pdf');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented put* locations', () => {
        expect(
          new StataHandler().getOutputs('test.uri', '#putpdf save example.pdf').length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs('test.uri', ' #putpdf save example.pdf').length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs('test.uri', '  # putpdf save example.pdf ').length,
        ).toEqual(0);
      });
      it('should handle multiple put* commands in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'test.uri',
          'putdocx save \'test\', replace\r\n putpdf save example.pdf \r\n\r\n di x\r\n  putexcel  save  "C:\\Documents\\test.xlsx" ',
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for est commands', () => {
        let libraries = new StataHandler().getOutputs('test.uri', 'esttab using C:\\dev\\test.csv');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'esttab - C:\\dev\\test.csv',
          type: 'data',
          path: 'C:\\dev\\test.csv',
        });
        libraries = new StataHandler().getOutputs('test.uri', 'estout using "tmp.csv"\r\n');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'estout - "tmp.csv"',
          type: 'data',
          path: '"tmp.csv"',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          ' esttab  using  example.csv , replace wide plain',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'esttab - example.csv',
          type: 'data',
          path: 'example.csv',
        });
      });
      it('should ignore save locations for est when command case mismatches', () => {
        const libraries = new StataHandler().getOutputs('test.uri', 'Estout using "tmp.csv"');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore save locations for est if there is no file extension', () => {
        let libraries = new StataHandler().getOutputs('test.uri', 'estadd using test csv');
        expect(libraries.length).toEqual(0);
        libraries = new StataHandler().getOutputs('test.uri', 'estadd using \r\n#test.csv');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented est save locations', () => {
        expect(new StataHandler().getOutputs('test.uri', '#esttab using test.csv').length).toEqual(
          0,
        );
        expect(new StataHandler().getOutputs('test.uri', ' #esttab using test.csv').length).toEqual(
          0,
        );
        expect(
          new StataHandler().getOutputs('test.uri', '  # esttab using test.csv ').length,
        ).toEqual(0);
      });
      it('should handle multiple est outputs in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'test.uri',
          'estadd using test.csv\r\ndi x\r\nestout using test.csv\r\n\r\nestout using C:\\test.csv\r\n  estout using "C:\\test.csv"  \r\nesttab using example.csv , replace wide plain \r \n  esttab  using  example.csv ,  replace  wide  plain \nestadd using test csv \nestadd using test .csv\nestout using /c:/test.csv',
        );
        expect(libraries.length).toEqual(8);
      });
      it('should retrieve save locations for table1 commands', () => {
        let libraries = new StataHandler().getOutputs(
          'test.uri',
          'table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(C:\\dev\\testing.csv, replace)',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'table1 - C:\\dev\\testing.csv',
          type: 'data',
          path: 'C:\\dev\\testing.csv',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          ' table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(  testing.csv , replace) ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'table1 - testing.csv',
          type: 'data',
          path: 'testing.csv',
        });
        libraries = new StataHandler().getOutputs(
          'test.uri',
          ' table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving("testing 2.csv", replace)',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'table1 - "testing 2.csv"',
          type: 'data',
          path: '"testing 2.csv"',
        });
      });
      it('should ignore save locations for est when command table1 mismatches', () => {
        const libraries = new StataHandler().getOutputs(
          'test.uri',
          'Table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(testing.csv, replace)',
        );
        expect(libraries.length).toEqual(0);
      });
      it('should ignore save locations for table1 if there is no file extension', () => {
        let libraries = new StataHandler().getOutputs(
          'test.uri',
          'table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(testing csv, replace)',
        );
        expect(libraries.length).toEqual(0);
        libraries = new StataHandler().getOutputs(
          'test.uri',
          'table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(\r\n#testing csv, replace)',
        );
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented table1 save locations', () => {
        expect(
          new StataHandler().getOutputs(
            'test.uri',
            '#table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(testing.csv, replace)',
          ).length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs(
            'test.uri',
            ' # table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(testing.csv, replace)',
          ).length,
        ).toEqual(0);
        expect(
          new StataHandler().getOutputs(
            'test.uri',
            '  #  table1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(testing.csv, replace) ',
          ).length,
        ).toEqual(0);
      });
      it('should handle multiple table1 outputs in a single string', () => {
        const libraries = new StataHandler().getOutputs(
          'test.uri',
          '\r\n table1 , vars ( gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving ( testing.csv , replace ) \r\ntable1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(testing.csv, replace)\r\ntable1, vars(gender cat \\ race cat \\ ridageyr contn %4.2f \\ married cat \\ income cat \\ education cat \\ bmxht contn %4.2f \\ bmxwt conts \\ bmxbmi conts \\ bmxwaist contn %4.2f \\ lbdhdd contn %4.2f \\ lbdldl contn %4.2f \\ lbxtr conts \\ lbxglu conts \\ lbxin conts) saving(testing, replace)',
        );
        expect(libraries.length).toEqual(2);
      });
    });
    describe('getInputs', () => {
      it('should handle empty/blank inputs', () => {
        expect(new StataHandler().getInputs('test.uri', '').length).toEqual(0);
        expect(new StataHandler().getInputs('test.uri', null).length).toEqual(0);
        expect(new StataHandler().getInputs('test.uri', undefined).length).toEqual(0);
        expect(new StataHandler().getInputs('test.uri', 'display x').length).toEqual(0);
      });
      it('should retrieve save locations for import commands', () => {
        let libraries = new StataHandler().getInputs('test.uri', 'import excel mydata ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'import excel - mydata',
          type: 'data',
          path: 'mydata',
        });
        libraries = new StataHandler().getInputs(
          'test.uri',
          'import delimited "mydata.txt", varnames(5)',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'import delimited - "mydata.txt"',
          type: 'data',
          path: '"mydata.txt"',
        });
        libraries = new StataHandler().getInputs(
          'test.uri',
          ' infile str16 name sex:sexfmt age using persons, wide ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'infile - persons',
          type: 'data',
          path: 'persons',
        });
        libraries = new StataHandler().getInputs('test.uri', 'inf using test.raw');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'inf - test.raw',
          type: 'data',
          path: 'test.raw',
        });
        libraries = new StataHandler().getInputs(
          'test.uri',
          'infix acc_rate 1-4 spdlimit 6-7 acc_pts 9-11 using test.raw',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'infix - test.raw',
          type: 'data',
          path: 'test.raw',
        });
        libraries = new StataHandler().getInputs(
          'test.uri',
          ' import sasxport5  mydata  , novallabels  ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'import sasxport5 - mydata',
          type: 'data',
          path: 'mydata',
        });
        libraries = new StataHandler().getInputs('test.uri', 'import dbase "C:\\test\\test.db"');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'import dbase - "C:\\test\\test.db"',
          type: 'data',
          path: '"C:\\test\\test.db"',
        });
        libraries = new StataHandler().getInputs(
          'test.uri',
          'xmluse "/Users/test/test.xml", doctype(dta)',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'xmluse - "/Users/test/test.xml"',
          type: 'data',
          path: '"/Users/test/test.xml"',
        });
      });
      it('should ignore save locations for export when command case mismatches', () => {
        const libraries = new StataHandler().getInputs('test.uri', 'Infile using mydata, wide');
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented export save locations', () => {
        expect(
          new StataHandler().getInputs('test.uri', '#infile using mydata, wide').length,
        ).toEqual(0);
        expect(
          new StataHandler().getInputs('test.uri', ' #infile using mydata, wide').length,
        ).toEqual(0);
        expect(
          new StataHandler().getInputs('test.uri', '  # infile using mydata, wide ').length,
        ).toEqual(0);
      });
      it('should handle multiple export outputs in a single string', () => {
        const libraries = new StataHandler().getInputs(
          'test.uri',
          'import delimited "mydata.txt", varnames(5)\r\n inf using test.raw \r\ndi x\r\n  import  sasxport5  mydata  , novallabels  \r\nInfile using mydata, wide',
        );
        expect(libraries.length).toEqual(3);
      });
    });
  });
});
