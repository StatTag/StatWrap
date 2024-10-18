import fs from 'fs';
import RHandler from '../../../../app/services/assets/handlers/r';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

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
        expect(handler.includeFile(Constants.StatWrapFiles.PROJECT)).toBeFalsy();
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
          handler.includeFile('https://github.com/test/content/test.r?ref=_1234&test2.rmd'),
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
          uri: '/Some/Invalid/Path.r',
          type: 'file',
          metadata: [],
        };
        const response = new RHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.RHandler',
          error: 'Unable to read code file',
        });
      });

      it("should skip over assets that aren't a file or directory", () => {
        const testAsset = {
          uri: '/Some/Other/Asset.r',
          type: 'other',
          metadata: [],
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
          metadata: [],
        };
        const response = new RHandler().scan(testAsset);
        expect(fs.readFileSync).toHaveBeenCalledTimes(1);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.RHandler',
          libraries: [
            {
              id: 'base',
              package: 'base',
            },
          ],
          inputs: [],
          outputs: [],
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
              metadata: [],
            },
            {
              uri: '/Some/Valid/Folder/SubFolder',
              type: 'directory',
              metadata: [],
              children: [
                {
                  uri: '/Some/Valid/Folder/SubFolder/File2.r',
                  type: 'file',
                  metadata: [],
                },
              ],
            },
          ],
        };
        const response = new RHandler().scan(testAsset);
        const expectedMetadata1 = {
          id: 'StatWrap.RHandler',
          libraries: [
            {
              id: 'base',
              package: 'base',
            },
          ],
          inputs: [],
          outputs: [],
        };
        const expectedMetadata2 = {
          id: 'StatWrap.RHandler',
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
        expect(new RHandler().getLibraries('test.uri', '').length).toEqual(0);
        expect(new RHandler().getLibraries('test.uri', null).length).toEqual(0);
        expect(new RHandler().getLibraries('test.uri', undefined).length).toEqual(0);
        expect(new RHandler().getLibraries('test.uri', 'print("hello world")').length).toEqual(0);
      });
      it('should retrieve unoquoted package', () => {
        const libraries = new RHandler().getLibraries('test.uri', 'library(test)');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });
      });
      it('should retrieve single quoted package', () => {
        const libraries = new RHandler().getLibraries('test.uri', "library('test')");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });
      });
      it('should retrieve double quoted package', () => {
        const libraries = new RHandler().getLibraries('test.uri', 'library("test")');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });
      });
      it('should retrieve package name without extra whitespace', () => {
        expect(new RHandler().getLibraries('test.uri', " library ( 'test' ) ")[0]).toMatchObject({
          id: 'test',
          package: 'test',
        });
        expect(
          new RHandler().getLibraries('test.uri', "\t\tlibrary\t(\t'test'\t)\t\n")[0],
        ).toMatchObject({
          id: 'test',
          package: 'test',
        });
      });
      it('should ignore empty library() calls', () => {
        expect(new RHandler().getLibraries('test.uri', 'library()').length).toEqual(0);
        expect(new RHandler().getLibraries('test.uri', ' library ( ) ').length).toEqual(0);
      });
      it('should retrieve multiple libraries', () => {
        const libraries = new RHandler().getLibraries(
          'test.uri',
          'library(one)\nrequire(two)\nlibrary(three)',
        );
        expect(libraries.length).toEqual(3);
        expect(libraries[0]).toMatchObject({
          id: 'one',
          package: 'one',
        });
        expect(libraries[1]).toMatchObject({
          id: 'two',
          package: 'two',
        });
        expect(libraries[2]).toMatchObject({
          id: 'three',
          package: 'three',
        });
      });
      it('should ignore commented out library() calls', () => {
        expect(new RHandler().getLibraries('test.uri', "#library('test')").length).toEqual(0);
        expect(new RHandler().getLibraries('test.uri', " # library ( 'test' ) ").length).toEqual(0);
      });
    });
    describe('getOutputs', () => {
      it('should handle empty/blank inputs', () => {
        expect(new RHandler().getOutputs('test.uri', '').length).toEqual(0);
        expect(new RHandler().getOutputs('test.uri', null).length).toEqual(0);
        expect(new RHandler().getOutputs('test.uri', undefined).length).toEqual(0);
        expect(new RHandler().getOutputs('test.uri', 'print("hello world")').length).toEqual(0);
      });
      it('should retrieve save locations for figures', () => {
        let libraries = new RHandler().getOutputs('test.uri', "pdf('C:\\dev\\test.pdf')");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "pdf - 'C:\\dev\\test.pdf'",
          type: 'figure',
          path: "'C:\\dev\\test.pdf'",
        });
        libraries = new RHandler().getOutputs('test.uri', "win.metafile(\r\n  'test.wmf'\r\n  ) ");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "win.metafile - 'test.wmf'",
          type: 'figure',
          path: "'test.wmf'",
        });
        libraries = new RHandler().getOutputs(
          'test.uri',
          "  jpeg('image_new.jpg', width = 350, height = '350' )",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "jpeg - 'image_new.jpg'",
          type: 'figure',
          path: "'image_new.jpg'",
        });
        libraries = new RHandler().getOutputs(
          'test.uri',
          " ggsave(\r\n  'test.png'\r\n  plot = last_plot()\r\n  )  ",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "ggsave - 'test.png'",
          type: 'figure',
          path: "'test.png'",
        });
      });
      it('should ignore save locations for figures when command case mismatches', () => {
        const libraries = new RHandler().getOutputs('test.uri', "Pdf('C:\\dev\\test.pdf')");
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented figure save locations', () => {
        expect(new RHandler().getOutputs('test.uri', "# pdf('C:\\dev\\test.pdf')").length).toEqual(
          0,
        );
        expect(new RHandler().getOutputs('test.uri', " #pdf('C:\\dev\\test.pdf')").length).toEqual(
          0,
        );
        expect(
          new RHandler().getOutputs('test.uri', "  #   pdf('C:\\dev\\test.pdf')").length,
        ).toEqual(0);
      });
      it('should handle multiple figure outputs in a single string', () => {
        const libraries = new RHandler().getOutputs(
          'test.uri',
          "pdf('C:\\dev\\test.pdf')\r\nprint('x)\r\nwin.metafile(\r\n  'test.wmf'\r\n  )\r\n\r\n    jpeg('image_new.jpg', width = 350, height = '350' )\r\n jpeg(x, width = 350, height = '350' )",
        );
        expect(libraries.length).toEqual(3);
      });
      it('should retrieve save locations for R base output files', () => {
        let libraries = new RHandler().getOutputs('test.uri', "write(df, 'C:\\dev\\test.txt')");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "write - 'C:\\dev\\test.txt'",
          type: 'data',
          path: "'C:\\dev\\test.txt'",
        });
        libraries = new RHandler().getOutputs(
          'test.uri',
          "write.csv(\r\n  df,\r\n  'test.csv'\r\n  )\r",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "write.csv - 'test.csv'",
          type: 'data',
          path: "'test.csv'",
        });
        libraries = new RHandler().getOutputs(
          'test.uri',
          "write.table( df , 'test.tab', append = FALSE ) ",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "write.table - 'test.tab'",
          type: 'data',
          path: "'test.tab'",
        });
        libraries = new RHandler().getOutputs('test.uri', 'write_csv(storms, "storms.csv")');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'write_csv - "storms.csv"',
          type: 'data',
          path: '"storms.csv"',
        });
      });
      it('should handle multiple R base data outputs in a single string', () => {
        const libraries = new RHandler().getOutputs(
          'test.uri',
          "write(df, 'C:\\dev\\test.txt')\r\nprint(x)\r\nwrite.csv(\r\n  df,\r\n  'test.csv'\r\n  ) \r\n\r\n   write.table( df , 'test.tab', append = FALSE ) \r\nwrite.table( df , x, append = FALSE ) ",
        );
        expect(libraries.length).toEqual(3);
      });
      it('should ignore save locations for R base output when command case mismatches', () => {
        const libraries = new RHandler().getOutputs(
          'test.uri',
          "cf.To_Markdown('C:\\dev\\test.png')",
        );
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented R base save locations', () => {
        expect(
          new RHandler().getOutputs('test.uri', "# write('C:\\dev\\test.txt')").length,
        ).toEqual(0);
        expect(new RHandler().getOutputs('test.uri', " #write.csv('./test.csv')").length).toEqual(
          0,
        );
        expect(
          new RHandler().getOutputs('test.uri', "  #   write.table ( 'test.tsv' )").length,
        ).toEqual(0);
      });
    });
    it('should ignore locations for output connections that are read-only', () => {
      let libraries = new RHandler().getOutputs(
        'test.uri',
        'f = file("myfile.jpg", "rb", blocking=FALSE)',
      );
      expect(libraries.length).toEqual(0);
      libraries = new RHandler().getOutputs(
        'test.uri',
        'f <- gzfile("myfile.gz", "tr", encoding="UTF-8")',
      );
      expect(libraries.length).toEqual(0);
      libraries = new RHandler().getOutputs('test.uri', 'f = file("test.dat")');
      expect(libraries.length).toEqual(0);
      libraries = new RHandler().getOutputs(
        'test.uri',
        'f <- fifo ( "test.dat", encoding="UTF-8" ) ',
      );
      expect(libraries.length).toEqual(0);
    });
    it('should retrieve output locations for connections', () => {
      let libraries = new RHandler().getOutputs(
        'test.uri',
        'f = file("test.txt", "wb", blocking=FALSE)',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'file - "test.txt"',
        type: 'data',
        path: '"test.txt"',
      });
      libraries = new RHandler().getOutputs(
        'test.uri',
        'f = gzfile(\r\n  "test.gz" ,\r\n  "bw"\r\n) ',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'gzfile - "test.gz"',
        type: 'data',
        path: '"test.gz"',
      });
      libraries = new RHandler().getOutputs(
        'test.uri',
        "f <- file('test.tmp', 'w', encoding='utf-8')",
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: "file - 'test.tmp'",
        type: 'data',
        path: "'test.tmp'",
      });
      libraries = new RHandler().getOutputs(
        'test.uri',
        "f = bzfile ( 'test.bzip', 'r+'  ,   encoding='utf-8' ) ",
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: "bzfile - 'test.bzip'",
        type: 'data',
        path: "'test.bzip'",
      });
    });
    it('should infer Rmd output', () => {
      let libraries = new RHandler().getOutputs('test.uri', '---\r\noutput: html_document\r\n---');
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'html_document - test.html',
        type: 'file',
        path: 'test.html',
      });
      libraries = new RHandler().getOutputs('test.uri', '---\r\noutput: html_notebook\r\n---');
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'html_notebook - test.nb.html',
        type: 'file',
        path: 'test.nb.html',
      });
      libraries = new RHandler().getOutputs('test.uri', '---\r\noutput: pdf_document\r\n---');
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'pdf_document - test.pdf',
        type: 'file',
        path: 'test.pdf',
      });
      libraries = new RHandler().getOutputs('test.uri', '---\r\noutput: word_document\r\n---');
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'word_document - test.docx',
        type: 'file',
        path: 'test.docx',
      });
      // Make sure we don't pick up extra things that can be specified for Word output.  This will implicitly
      // test other things that have this type of option, so we're only going to test it for the Word
      // case explicitly.
      libraries = new RHandler().getOutputs(
        'test.uri',
        '---\r\noutput:\r\n  word_document:\r\n    reference_docx: my-styles.docx\r\n---',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'word_document - test.docx',
        type: 'file',
        path: 'test.docx',
      });
      libraries = new RHandler().getOutputs('test.uri', '---\r\noutput: odt_document\r\n---');
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'odt_document - test.odt',
        type: 'file',
        path: 'test.odt',
      });
      libraries = new RHandler().getOutputs('test.uri', '---\r\noutput: rtf_document\r\n---');
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'rtf_document - test.rtf',
        type: 'file',
        path: 'test.rtf',
      });
      libraries = new RHandler().getOutputs('test.uri', '---\r\noutput: md_document\r\n---');
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'md_document - test.md',
        type: 'file',
        path: 'test.md',
      });
      libraries = new RHandler().getOutputs(
        'test.uri',
        '---\r\noutput: ioslides_presentation\r\n---',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'ioslides_presentation - test.html',
        type: 'file',
        path: 'test.html',
      });
      // Currently not supported - need to figure out a fix
      // libraries = new RHandler().getOutputs(
      //   'test.uri',
      //   '---\r\noutput: revealjs::revealjs_presentation\r\n---'
      // );
      // expect(libraries.length).toEqual(1);
      // expect(libraries[0]).toMatchObject({
      //   id: 'revealjs::revealjs_presentation - test.html',
      //   type: 'file',
      //   path: 'test.html'
      // });
      libraries = new RHandler().getOutputs(
        'test.uri',
        '---\r\noutput: slidly_presentation\r\n---',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'slidly_presentation - test.html',
        type: 'file',
        path: 'test.html',
      });
      libraries = new RHandler().getOutputs(
        'test.uri',
        '---\r\noutput: beamer_presentation\r\n---',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'beamer_presentation - test.html',
        type: 'file',
        path: 'test.html',
      });
      libraries = new RHandler().getOutputs(
        'test.uri',
        '---\r\noutput: powerpoint_presentation\r\n---',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'powerpoint_presentation - test.pptx',
        type: 'file',
        path: 'test.pptx',
      });
    });
    it.onMac('should discern the right output file name for Rmd output', () => {
      const libraries = new RHandler().getOutputs(
        '/home/test/test.uri',
        '---\r\noutput: html_document\r\n---',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'html_document - test.html',
        type: 'file',
        path: 'test.html',
      });
    });
    it.onWindows('should discern the right output file name for Rmd output', () => {
      const libraries = new RHandler().getOutputs(
        'C:\\test\\test.uri',
        '---\r\noutput: html_document\r\n---',
      );
      expect(libraries.length).toEqual(1);
      expect(libraries[0]).toMatchObject({
        id: 'html_document - test.html',
        type: 'file',
        path: 'test.html',
      });
    });
    it('should infer multiple Rmd outputs', () => {
      const libraries = new RHandler().getOutputs(
        'test.uri',
        '---\ntitle: Render a table in a tiny environment\noutput:\n  pdf_document: default\n  html_document: default\n---',
      );
      expect(libraries.length).toEqual(2);
      expect(libraries[0]).toMatchObject({
        id: 'pdf_document - test.pdf',
        type: 'file',
        path: 'test.pdf',
      });
      expect(libraries[1]).toMatchObject({
        id: 'html_document - test.html',
        type: 'file',
        path: 'test.html',
      });
    });
    it('should handle multiple connection statements in a single string', () => {
      const libraries = new RHandler().getOutputs(
        'test.uri',
        "f = file(\"test.txt\", \"wb\", blocking=FALSE)\r\n\r\nprint(\"Hello world\")\r\n\r\n\t  f = gzfile(\r\n  \"test.gz\" ,\r\n  \"w\"\r\n) \r\n\r\n f = bzfile ( 'test.bzip', 'r+'  ,   encoding='utf-8' ) \r\nr <- file('test.tmp', 'r', encoding='utf-8') ",
      );
      expect(libraries.length).toEqual(3);
    });
    it('should ignore save locations for connections when command case mismatches', () => {
      const libraries = new RHandler().getOutputs('test.uri', "FILE('C:\\dev\\test.png', 'w')");
      expect(libraries.length).toEqual(0);
    });
    it('should ignore commented out connection lines', () => {
      expect(new RHandler().getOutputs('test.uri', '# f = file("test.dat", "w")').length).toEqual(
        0,
      );
      expect(new RHandler().getOutputs('test.uri', "   #fifo('test.csv')").length).toEqual(0);
      expect(
        new RHandler().getOutputs('test.uri', '   #    f <- file("test.dat", "w")').length,
      ).toEqual(0);
    });
    describe('getInputs', () => {
      it('should handle empty/blank inputs', () => {
        expect(new RHandler().getInputs('test.uri', '').length).toEqual(0);
        expect(new RHandler().getInputs('test.uri', null).length).toEqual(0);
        expect(new RHandler().getInputs('test.uri', undefined).length).toEqual(0);
        expect(new RHandler().getInputs('test.uri', 'print("hello world")').length).toEqual(0);
      });
      it('should retrieve load locations for R base output files', () => {
        let libraries = new RHandler().getInputs('test.uri', "scan('C:\\dev\\test.txt')");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "scan - 'C:\\dev\\test.txt'",
          type: 'data',
          path: "'C:\\dev\\test.txt'",
        });
        libraries = new RHandler().getInputs(
          'test.uri',
          "df <- read.csv(\r\n  'test.csv'\r\n  )\r",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "read.csv - 'test.csv'",
          type: 'data',
          path: "'test.csv'",
        });
        libraries = new RHandler().getInputs(
          'test.uri',
          "df = read.table( 'test.tab', append = FALSE ) ",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "read.table - 'test.tab'",
          type: 'data',
          path: "'test.tab'",
        });
        libraries = new RHandler().getInputs('test.uri', 'read_csv("storms.csv")');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'read_csv - "storms.csv"',
          type: 'data',
          path: '"storms.csv"',
        });
      });
      it('should handle multiple R base data inputs in a single string', () => {
        const libraries = new RHandler().getInputs(
          'test.uri',
          "scan('C:\\dev\\test.txt')\r\nprint(x)\r\rread.csv(\r\n \r\n  'test.csv'\r\n  ) \r\n\r\n   read.table( 'test.tab', append = FALSE ) \r\read.table( x, append = FALSE ) ",
        );
        expect(libraries.length).toEqual(3);
      });
      it('should ignore save locations for R base input when command case mismatches', () => {
        const libraries = new RHandler().getInputs('test.uri', "read_Delim('C:\\dev\\test.txt')");
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented R base load locations', () => {
        expect(new RHandler().getInputs('test.uri', "# scan('C:\\dev\\test.txt')").length).toEqual(
          0,
        );
        expect(new RHandler().getInputs('test.uri', " #read.csv('./test.csv')").length).toEqual(0);
        expect(
          new RHandler().getInputs('test.uri', "  #   read.table ( 'test.tsv' )").length,
        ).toEqual(0);
      });
      it('should ignore locations for connections that are write-only', () => {
        let libraries = new RHandler().getInputs(
          'test.uri',
          'f = file("myfile.jpg", "wb", blocking=FALSE)',
        );
        expect(libraries.length).toEqual(0);
        libraries = new RHandler().getInputs(
          'test.uri',
          ' f <- gzfile ( "myfile.gz", "tw", encoding="UTF-8" ) ',
        );
        expect(libraries.length).toEqual(0);
      });
      it('should retrieve input locations for connections', () => {
        let libraries = new RHandler().getInputs(
          'test.uri',
          'f = file("test.txt", "rb", blocking=FALSE)',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'file - "test.txt"',
          type: 'data',
          path: '"test.txt"',
        });
        libraries = new RHandler().getInputs(
          'test.uri',
          'f = gzfile(\r\n  "test.gz" ,\r\n  "br"\r\n) ',
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'gzfile - "test.gz"',
          type: 'data',
          path: '"test.gz"',
        });
        libraries = new RHandler().getInputs(
          'test.uri',
          "f <- file('test.tmp', 'r', encoding='utf-8')",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "file - 'test.tmp'",
          type: 'data',
          path: "'test.tmp'",
        });
        libraries = new RHandler().getInputs(
          'test.uri',
          "f = bzfile ( 'test.bzip', 'w+'  ,   encoding='utf-8' ) ",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "bzfile - 'test.bzip'",
          type: 'data',
          path: "'test.bzip'",
        });
        libraries = new RHandler().getInputs('test.uri', 'f <- fifo ( "test.dat" ) ');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'fifo - "test.dat"',
          type: 'data',
          path: '"test.dat"',
        });
      });
      it('should handle multiple input connection statements in a single string', () => {
        const libraries = new RHandler().getInputs(
          'test.uri',
          "f = file(\"test.txt\", \"rb\", blocking=FALSE)\r\n\r\nprint(\"Hello world\")\r\n\r\n\t  f = gzfile(\r\n  \"test.gz\" ,\r\n  \"r\"\r\n) \r\n\r\n f = bzfile ( 'test.bzip', 'w+'  ,   encoding='utf-8' ) \r\nr <- file('test.tmp', 'w', encoding='utf-8') ",
        );
        expect(libraries.length).toEqual(3);
      });
      it('should ignore load locations for connections when command case mismatches', () => {
        const libraries = new RHandler().getInputs('test.uri', "FILE('C:\\dev\\test.png', 'r')");
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented out input connection lines', () => {
        expect(new RHandler().getInputs('test.uri', '# f = file("test.dat", "r")').length).toEqual(
          0,
        );
        expect(new RHandler().getInputs('test.uri', "   #fifo('test.csv')").length).toEqual(0);
        expect(
          new RHandler().getInputs('test.uri', '   #    f <- file("test.dat", "r")').length,
        ).toEqual(0);
      });
      it('should retrieve load locations for sourced files', () => {
        let libraries = new RHandler().getInputs('test.uri', "source('C:\\dev\\test.R')");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "source - 'C:\\dev\\test.R'",
          type: 'code',
          path: "'C:\\dev\\test.R'",
        });
        libraries = new RHandler().getInputs('test.uri', " sys.source ( \r\n  'test.r'\r\n  )\r ");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "sys.source - 'test.r'",
          type: 'code',
          path: "'test.r'",
        });
        libraries = new RHandler().getInputs('test.uri', "source( 'test.R', local = FALSE ) ");
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: "source - 'test.R'",
          type: 'code',
          path: "'test.R'",
        });
        libraries = new RHandler().getInputs('test.uri', 'source("storms.r")');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'source - "storms.r"',
          type: 'code',
          path: '"storms.r"',
        });
      });
      it('should handle multiple sourced files in a single string', () => {
        const libraries = new RHandler().getInputs(
          'test.uri',
          "source('C:\\dev\\test.R')\r\nprint(x)\r\r sys.source ( \r\n  'test.r'\r\n  )\r \r\n\r\n   source( 'test.R', local = FALSE ) \r\nsource(x) ",
        );
        expect(libraries.length).toEqual(3);
      });
      it('should ignore sourced locations when command case mismatches', () => {
        const libraries = new RHandler().getInputs('test.uri', "Source('C:\\dev\\test.r')");
        expect(libraries.length).toEqual(0);
      });
      it('should ignore commented source locations', () => {
        expect(new RHandler().getInputs('test.uri', "# source('C:\\dev\\test.r')").length).toEqual(
          0,
        );
        expect(new RHandler().getInputs('test.uri', " #source('./test.R')").length).toEqual(0);
        expect(new RHandler().getInputs('test.uri', "  #   source ( 'test.r' )").length).toEqual(0);
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
