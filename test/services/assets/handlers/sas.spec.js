import fs from 'fs';
import SASHandler from '../../../../app/services/assets/handlers/sas';

jest.mock('fs');
jest.mock('os');

describe('services', () => {
  describe('SASHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new SASHandler().id()).toEqual(`StatWrap.${SASHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should exclude invalid URIs', () => {
        const handler = new SASHandler();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile(undefined)).toBeFalsy();
        expect(handler.includeFile('')).toBeFalsy();
        expect(handler.includeFile('   ')).toBeFalsy();
      });

      it('should exclude non-SAS files', () => {
        const handler = new SASHandler();
        expect(handler.includeFile('/User/test/Project/sas')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Thumbs.db')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.json')).toBeFalsy();
      });

      it('should exclude where SAS extension exists but is not the last', () => {
        const handler = new SASHandler();
        expect(handler.includeFile('/User/test/Project/r.sas.zip')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/Processor.sas.bak')).toBeFalsy();
        expect(handler.includeFile('.statwrap-project.sas.r3.ri.json')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/r.sas4')).toBeFalsy();
      });

      it('should exclude extension-only URIs', () => {
        const handler = new SASHandler();
        expect(handler.includeFile('/User/test/Project/.sas')).toBeFalsy();
        expect(handler.includeFile('/User/test/Project/  .sas')).toBeFalsy();
        expect(handler.includeFile('C:/test/Project/.sas3')).toBeFalsy();
        expect(handler.includeFile('.sasi')).toBeFalsy();
      });

      it('should include allowable extensions (case insensitive)', () => {
        const handler = new SASHandler();
        expect(handler.includeFile('/User/test/Project/code/test.sas')).toBeTruthy();
        expect(handler.includeFile('/User/test/Project/code/test.SAS')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.SaS')).toBeTruthy();
        expect(handler.includeFile('C:/test/Project/test.saS')).toBeTruthy();
        expect(handler.includeFile('mine.SAS')).toBeTruthy();
        expect(handler.includeFile('mine.sas')).toBeTruthy();
      });

      it('should ignore URLs where the domain could look like the extension', () => {
        const handler = new SASHandler();
        expect(handler.includeFile('http://test.sas')).toBeFalsy();
        expect(handler.includeFile('https://sas.com')).toBeFalsy();
      });

      it('should include URL-based URIs that have parameters', () => {
        const handler = new SASHandler();
        expect(
          handler.includeFile('http://github.com/test/content/test.sas?ref=_1234')
        ).toBeTruthy();
        expect(
          handler.includeFile('https://github.com/test/content/test.sas?ref=_1234&test2.sas')
        ).toBeTruthy();
      });
    });

    describe('scan', () => {
      it('should only add the metadata once', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        const handler = new SASHandler();
        const testAsset = {
          uri: '/Some/Invalid/Path.sas',
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
          uri: '/Some/Invalid/Path.sas',
          type: 'file',
          metadata: []
        };
        const response = new SASHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.SASHandler',
          error: 'Unable to read code file'
        });
      });

      it("should skip over assets that aren't a file or directory", () => {
        const testAsset = {
          uri: '/Some/Other/Asset.sas',
          type: 'other',
          metadata: []
        };
        const response = new SASHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(0);
        expect(response.metadata.length).toEqual(0);
      });

      it('should return a response with details for a valid asset', () => {
        fs.readFileSync.mockReturnValue("%include '/test/path/test.sas';");

        const testAsset = {
          uri: '/Some/Valid/File.sas',
          type: 'file',
          metadata: []
        };
        const response = new SASHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.SASHandler',
          libraries: [
            {
              id: '/test/path/test.sas',
              package: '/test/path/test.sas'
            }
          ],
          inputs: [],
          outputs: []
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
              uri: '/Some/Valid/Folder/File1.sas',
              type: 'file',
              metadata: []
            },
            {
              uri: '/Some/Valid/Folder/SubFolder',
              type: 'directory',
              metadata: [],
              children: [
                {
                  uri: '/Some/Valid/Folder/SubFolder/File2.SAS',
                  type: 'file',
                  metadata: []
                }
              ]
            }
          ]
        };
        const response = new SASHandler().scan(testAsset);
        const expectedMetadata1 = {
          id: 'StatWrap.SASHandler',
          libraries: [],
          inputs: [],
          outputs: []
        };
        const expectedMetadata2 = {
          id: 'StatWrap.SASHandler',
          libraries: [],
          inputs: [],
          outputs: []
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
        expect(new SASHandler().getLibraries('').length).toEqual(0);
        expect(new SASHandler().getLibraries(null).length).toEqual(0);
        expect(new SASHandler().getLibraries(undefined).length).toEqual(0);
        expect(new SASHandler().getLibraries('print("hello world")').length).toEqual(0);
      });
      it('should identify %include statements with paths', () => {
        let libraries = new SASHandler().getLibraries("%include 'test.sas';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.sas',
          package: 'test.sas'
        });

        libraries = new SASHandler().getLibraries("%INCLUDE 'test.sas';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.sas',
          package: 'test.sas'
        });

        libraries = new SASHandler().getLibraries("%inc 'test.sas';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.sas',
          package: 'test.sas'
        });

        libraries = new SASHandler().getLibraries("%INC 'test.sas';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.sas',
          package: 'test.sas'
        });

        libraries = new SASHandler().getLibraries(" %INC\n'test.sas' ; ");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test.sas',
          package: 'test.sas'
        });
      });
      it('should ignore invalid %include statements with paths', () => {
        expect(new SASHandler().getLibraries("%include test.sas';").length).toEqual(0);
        expect(new SASHandler().getLibraries("%INCLUDE 'test.sas;").length).toEqual(0);
        expect(new SASHandler().getLibraries("%inc 'test.sas'").length).toEqual(0);
        expect(new SASHandler().getLibraries("% INC 'test.sas';").length).toEqual(0);
      });
      it('should identify %include statements with refs', () => {
        let libraries = new SASHandler().getLibraries('%include test;');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new SASHandler().getLibraries('%INCLUDE test;');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new SASHandler().getLibraries('%inc test;');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new SASHandler().getLibraries('%INC test;');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });

        libraries = new SASHandler().getLibraries(' %INC\ntest ; ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test'
        });
      });
      it('should ignore invalid %include statements with refs', () => {
        expect(new SASHandler().getLibraries('%include ;').length).toEqual(0);
        expect(new SASHandler().getLibraries('%INCLUDE ref1').length).toEqual(0);
        expect(new SASHandler().getLibraries('% INC ref;').length).toEqual(0);
      });
      it('should identify multiple %include statements', () => {
        const libraries = new SASHandler().getLibraries(
          "%include 'test.sas';\r\n%INCLUDE ref0;\r\n%include 'test2.sas';\r\n%inc ref1;\r\n"
        );
        expect(libraries.length).toEqual(4);
        // Note that the order of the libraries found depends on the order in which the
        // matching regex is run.  So our file includes are first, then the references.
        expect(libraries[0]).toMatchObject({
          id: 'test.sas',
          package: 'test.sas'
        });
        expect(libraries[1]).toMatchObject({
          id: 'test2.sas',
          package: 'test2.sas'
        });
        expect(libraries[2]).toMatchObject({
          id: 'ref0',
          package: 'ref0'
        });
        expect(libraries[3]).toMatchObject({
          id: 'ref1',
          package: 'ref1'
        });
      });
      it('should identify filename references', () => {
        const libraries = new SASHandler().getLibraries("filename test 'test.sas';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test.sas'
        });
      });
      it('should identify filename references with encodings', () => {
        const libraries = new SASHandler().getLibraries(
          'filename test \'test.sas\' encoding="utf-8";'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test.sas'
        });
      });
      it('should ignore invalid filename statements', () => {
        expect(new SASHandler().getLibraries('filename ;').length).toEqual(0);
        expect(new SASHandler().getLibraries('filename ref1').length).toEqual(0);
        expect(new SASHandler().getLibraries("file name ref 'test';").length).toEqual(0);
      });
      it('should identify libname references', () => {
        const libraries = new SASHandler().getLibraries("libname test 'test-lib';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test-lib'
        });
      });
      it('should ignore invalid libname statements', () => {
        expect(new SASHandler().getLibraries('libname ;').length).toEqual(0);
        expect(new SASHandler().getLibraries('libname ref1').length).toEqual(0);
        expect(new SASHandler().getLibraries("lib name ref 'test';").length).toEqual(0);
      });
    });
    describe('getLibraryId', () => {
      it('should return a default label when parameter is missing', () => {
        expect(new SASHandler().getLibraryId('')).toEqual('(unknown)');
        expect(new SASHandler().getLibraryId(null)).toEqual('(unknown)');
        expect(new SASHandler().getLibraryId(undefined)).toEqual('(unknown)');
      });
      it('should include package name when provided', () => {
        expect(new SASHandler().getLibraryId('testlib')).toEqual('testlib');
      });
    });
    describe('getOutputs', () => {
      it('should handle empty/blank inputs', () => {
        expect(new SASHandler().getOutputs('').length).toEqual(0);
        expect(new SASHandler().getOutputs(null).length).toEqual(0);
        expect(new SASHandler().getOutputs(undefined).length).toEqual(0);
        expect(new SASHandler().getOutputs('%put "test"').length).toEqual(0);
      });
      it('should retrieve save locations for figures', () => {
        let libraries = new SASHandler().getOutputs('ods pdf file="";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ods pdf - ""',
          type: 'figure',
          path: '""'
        });
        libraries = new SASHandler().getOutputs('ods pdf file="test.pdf";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ods pdf - "test.pdf"',
          type: 'figure',
          path: '"test.pdf"'
        });
        libraries = new SASHandler().getOutputs("ods epub file='test.epub';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "ods epub - 'test.epub'",
          type: 'figure',
          path: "'test.epub'"
        });
        libraries = new SASHandler().getOutputs('ODS Pdf File="test.pdf";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ODS Pdf - "test.pdf"',
          type: 'figure',
          path: '"test.pdf"'
        });
        libraries = new SASHandler().getOutputs('ODS PDF\r\n  FILE="test.pdf";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ODS PDF - "test.pdf"',
          type: 'figure',
          path: '"test.pdf"'
        });
        libraries = new SASHandler().getOutputs(
          "ods pdf (id=SapphireStyle) style=Sapphire file='grain-2.pdf' pdftoc=3;"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "ods pdf - 'grain-2.pdf'",
          type: 'figure',
          path: "'grain-2.pdf'"
        });
      });
      it('should ignore save locations for figures in invalid statements', () => {
        // Missing semicolon
        expect(new SASHandler().getOutputs('ods pdf file="test.pdf"').length).toEqual(0);
        // Missing quotes
        expect(new SASHandler().getOutputs('ods pdf file=test.pdf').length).toEqual(0);
        // Invalid command
        expect(new SASHandler().getOutputs('ods pdfd file="test.pdf"').length).toEqual(0);
      });
      it('should ignore commented figure save locations', () => {
        expect(new SASHandler().getOutputs('* ods pdf file="test.pdf";').length).toEqual(0);
        expect(new SASHandler().getOutputs(' *ods pdf file="test.pdf";').length).toEqual(0);
        expect(new SASHandler().getOutputs('  *   ods pdf file="test.pdf";  ').length).toEqual(0);
      });
      it('should handle multiple figure outputs in a single string', () => {
        const libraries = new SASHandler().getOutputs(
          'ods pdf file="";\r\n%put \'hello\'\r\n  ods pdf file="test.pdf" ;   \r\n\r\n\t  ODS Pdf File=\'test.pdf\';'
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for data', () => {
        let libraries = new SASHandler().getOutputs('ods excel file="";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ods excel - ""',
          type: 'data',
          path: '""'
        });
        libraries = new SASHandler().getOutputs('ods csvall file="test.csv";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ods csvall - "test.csv"',
          type: 'data',
          path: '"test.csv"'
        });
        libraries = new SASHandler().getOutputs("ods html5 body='test.html';");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "ods html5 - 'test.html'",
          type: 'data',
          path: "'test.html'"
        });
        libraries = new SASHandler().getOutputs('ODS Html File="test.html";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ODS Html - "test.html"',
          type: 'data',
          path: '"test.html"'
        });
        libraries = new SASHandler().getOutputs('ODS CSVALL\r\n  FILE="test.csv";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'ODS CSVALL - "test.csv"',
          type: 'data',
          path: '"test.csv"'
        });
      });
      it('should ignore save locations for data in invalid statements', () => {
        // Missing semicolon
        expect(new SASHandler().getOutputs('ods csvall file="test.csv"').length).toEqual(0);
        // Missing quotes
        expect(new SASHandler().getOutputs('ods csvall file=test.csv').length).toEqual(0);
        // Invalid command
        expect(new SASHandler().getOutputs('ods csval file="test.csv"').length).toEqual(0);
      });
      it('should ignore commented data save locations', () => {
        expect(new SASHandler().getOutputs('* ods csvall file="test.pdf";').length).toEqual(0);
        expect(new SASHandler().getOutputs(' *ods excel file="test.xlsx";').length).toEqual(0);
        // eslint-disable-next-line prettier/prettier
        expect(new SASHandler().getOutputs('  *   ods excel file="test.xlsx";  ').length).toEqual(0);
      });
      it('should handle multiple data outputs in a single string', () => {
        const libraries = new SASHandler().getOutputs(
          'ods excel file="";\r\n%put \'hello\'\r\n  ods csvall file="test.csv" ;   \r\n\r\n\t  ODS Html Body=\'test.html\';'
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for exports', () => {
        let libraries = new SASHandler().getOutputs('proc export outfile="";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'proc export - ""',
          type: 'data',
          path: '""'
        });
        libraries = new SASHandler().getOutputs('proc export outfile="test.xlsx";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'proc export - "test.xlsx"',
          type: 'data',
          path: '"test.xlsx"'
        });
        libraries = new SASHandler().getOutputs(
          "PROC EXPORT \r\n  data=Subset\r\n  dbms=xlsx\r\n  outfile='test.xlsx'\r\n  replace;\r\nrun;"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "PROC EXPORT - 'test.xlsx'",
          type: 'data',
          path: "'test.xlsx'"
        });
      });
      it('should ignore save locations for exports in invalid statements', () => {
        // Missing semicolon
        expect(new SASHandler().getOutputs('proc export outfile="test.xlsx"').length).toEqual(0);
        // Missing quotes
        expect(new SASHandler().getOutputs('proc export outfile=test.csv').length).toEqual(0);
        // Invalid command
        expect(new SASHandler().getOutputs('procexport outfile="test.csv"').length).toEqual(0);
      });
      it('should ignore commented export save locations', () => {
        expect(new SASHandler().getOutputs('* proc export outfile="test.xlsx";').length).toEqual(0);
        expect(new SASHandler().getOutputs(' *proc export outfile="test.xlsx";').length).toEqual(0);
        expect(
          new SASHandler().getOutputs('  *   proc export outfile="test.xlsx";  ').length
        ).toEqual(0);
      });
      it('should handle multiple exports in a single string', () => {
        const libraries = new SASHandler().getOutputs(
          'proc export outfile="";\r\n%put \'hello\'\r\n proc export outfile="test.xlsx";   \r\n\r\n\t  PROC EXPORT \r\n  data=Subset\r\n  dbms=xlsx\r\n  outfile=\'test.xlsx\'\r\n  replace;\r\nrun;'
        );
        expect(libraries.length).toEqual(3);
      });
    });
    describe('getInputs', () => {
      it('should retrieve save locations for imports', () => {
        let libraries = new SASHandler().getInputs('proc import datafile="";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'proc import - ""',
          type: 'data',
          path: '""'
        });
        libraries = new SASHandler().getInputs('proc import datafile="test.xlsx";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'proc import - "test.xlsx"',
          type: 'data',
          path: '"test.xlsx"'
        });
        libraries = new SASHandler().getInputs(
          "PROC IMPORT \r\n  OUT=Subset\r\n  dbms=xlsx\r\n  DATAFILE='test.xlsx'\r\n  replace;\r\nrun;"
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "PROC IMPORT - 'test.xlsx'",
          type: 'data',
          path: "'test.xlsx'"
        });
      });
      it('should ignore save locations for imports in invalid statements', () => {
        // Missing semicolon
        expect(new SASHandler().getInputs('proc import datafile="test.xlsx"').length).toEqual(0);
        // Missing quotes
        expect(new SASHandler().getInputs('proc import datafile=test.csv').length).toEqual(0);
        // Invalid command
        expect(new SASHandler().getInputs('procimport datafile="test.csv"').length).toEqual(0);
      });
      it('should ignore commented import save locations', () => {
        expect(new SASHandler().getInputs('* proc import datafile="test.xlsx";').length).toEqual(0);
        expect(new SASHandler().getInputs(' *proc import datafile="test.xlsx";').length).toEqual(0);
        expect(
          new SASHandler().getInputs('  *   proc import datafile="test.xlsx";  ').length
        ).toEqual(0);
      });
      it('should handle multiple imports in a single string', () => {
        const libraries = new SASHandler().getInputs(
          'proc import datafile="";\r\n%put \'hello\'\r\n proc import datafile="test.xlsx";   \r\n\r\n\t  PROC IMPORT \r\n  OUT=Subset\r\n  DBMS=xlsx\r\n  DATAFILE=\'test.xlsx\'\r\n  REPLACE;\r\nRUN;'
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for infile commands', () => {
        let libraries = new SASHandler().getInputs('infile "";');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'infile - ""',
          type: 'data',
          path: '""'
        });
        libraries = new SASHandler().getInputs('Infile "test.txt"; ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'Infile - "test.txt"',
          type: 'data',
          path: '"test.txt"'
        });
        libraries = new SASHandler().getInputs("INFILE \r\n  'test.txt'\r\n  FIRSTOBS = 2 ;\r\n ");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "INFILE - 'test.txt'",
          type: 'data',
          path: "'test.txt'"
        });
      });
      it('should ignore save locations for infile commands in invalid statements', () => {
        // Missing semicolon
        expect(new SASHandler().getInputs('infile "test.txt"').length).toEqual(0);
        // Missing quotes
        expect(new SASHandler().getInputs('infile test.txt;').length).toEqual(0);
        // Invalid command
        expect(new SASHandler().getInputs('infiles "test.txt";').length).toEqual(0);
      });
      it('should ignore commented infile command locations', () => {
        expect(new SASHandler().getInputs('* infile "test.txt";').length).toEqual(0);
        expect(new SASHandler().getInputs(' *infile "test.txt";').length).toEqual(0);
        expect(new SASHandler().getInputs('  *   infile "test.txt"; ').length).toEqual(0);
      });
      it('should handle multiple infile commands in a single string', () => {
        const libraries = new SASHandler().getInputs(
          'infile "";\r\n%put \'hello\'\r\n Infile "test.txt";   \r\n\r\n\t  INFILE \r\n  \'test.txt\'\r\n  FIRSTOBS = 2 ;\r\n '
        );
        expect(libraries.length).toEqual(3);
      });
    });
  });
});
