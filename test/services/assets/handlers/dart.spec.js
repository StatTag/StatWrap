import fs from 'fs';
import DartHandler from '../../../../app/services/assets/handlers/dart';

jest.mock('fs');

describe('services', () => {
  describe('DartHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new DartHandler().id()).toEqual(`StatWrap.${DartHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include Dart files and exclude others', () => {
        const handler = new DartHandler();
        // Valid files
        expect(handler.includeFile('/path/to/script.dart')).toBeTruthy();
        expect(handler.includeFile('/path/to/MAIN.DART')).toBeTruthy();

        // Invalid files
        expect(handler.includeFile('/path/to/script.js')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.dart.bak')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should extract standard import statements', () => {
        const libraries = new DartHandler().getLibraries(
          'test.uri',
          "import 'package:http/http.dart';\r\nimport 'dart:io';"
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'http/http.dart',
          module: 'http/http.dart',
          import: 'package:http/http.dart',
          alias: null,
        });
        expect(libraries[1]).toMatchObject({
          id: 'io',
          module: 'io',
          import: 'dart:io',
          alias: null,
        });
      });

      it('should extract import statements with aliases', () => {
        const libraries = new DartHandler().getLibraries(
          'test.uri',
          'import "package:path/path.dart" as p;'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'path/path.dart',
          module: 'path/path.dart',
          import: 'package:path/path.dart',
          alias: 'p',
        });
      });

      it('should handle show and hide combinators', () => {
        const libraries = new DartHandler().getLibraries(
          'test.uri',
          'import "package:math/math.dart" show max;\nimport "package:async/async.dart" hide Stream;'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0].id).toEqual('math/math.dart');
        expect(libraries[1].id).toEqual('async/async.dart');
      });
    });

    describe('getInputs', () => {
      it('should detect file read operations', () => {
        const inputs = new DartHandler().getInputs(
          'test.uri',
          'final content = File("input.txt").readAsStringSync();'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read - "input.txt"',
          type: 'data',
          path: '"input.txt"',
        });
      });

      it('should detect database open operations', () => {
        const inputs = new DartHandler().getInputs(
          'test.uri',
          'var db = await openDatabase("my_database.db");'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'DB Conn - "my_database.db"',
          type: 'data',
          path: '"my_database.db"',
        });
      });
      
      it('should deduplicate multiple reads of the same file', () => {
        const inputs = new DartHandler().getInputs(
          'test.uri',
          'File("input.txt").readAsLines();\nFile("input.txt").readAsString();'
        );
        expect(inputs.length).toEqual(1);
      });

      it('should detect loadString operations', () => {
        const inputs = new DartHandler().getInputs(
          'test.uri',
          'rootBundle.loadString("assets/data.json");'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read - "assets/data.json"',
          type: 'data',
          path: '"assets/data.json"',
        });
      });

      it('should detect file reads with fully qualified linux/macos paths', () => {
        const inputs = new DartHandler().getInputs(
          'test.uri',
          'File("/test/dir/test.txt").readAsStringSync();'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read - "/test/dir/test.txt"',
          type: 'data',
          path: '"/test/dir/test.txt"',
        });
      });

      it('should detect file reads with fully qualified windows paths', () => {
        const inputs = new DartHandler().getInputs(
          'test.uri',
          'File("C:\\\\test\\\\dir\\\\test.txt").readAsStringSync();'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read - "C:\\\\test\\\\dir\\\\test.txt"',
          type: 'data',
          path: '"C:\\\\test\\\\dir\\\\test.txt"',
        });
      });

      it('should detect file reads with relative paths', () => {
        const inputs = new DartHandler().getInputs(
          'test.uri',
          'File("../data/test.csv").readAsStringSync();'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read - "../data/test.csv"',
          type: 'data',
          path: '"../data/test.csv"',
        });
      });
    });

    describe('getOutputs', () => {
      it('should detect file write operations', () => {
        const outputs = new DartHandler().getOutputs(
          'test.uri',
          'final file = await File("output.txt").writeAsString("Hello World");'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'File Write - "output.txt"',
          type: 'data',
          path: '"output.txt"',
        });
      });

      it('should deduplicate multiple writes to the same file', () => {
        const outputs = new DartHandler().getOutputs(
          'test.uri',
          'File("output.txt").writeAsString("A");\nFile("output.txt").writeAsBytes([1, 2]);'
        );
        expect(outputs.length).toEqual(1);
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Dart file', () => {
        fs.readFileSync.mockReturnValue('import "dart:math";\nvoid main() {}');

        const testAsset = {
          uri: '/path/to/main.dart',
          type: 'file',
          metadata: [],
        };

        const response = new DartHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.DartHandler',
          libraries: [
            {
              id: 'math',
              module: 'math',
              import: 'dart:math',
            }
          ]
        });
      });
    });
  });
});
