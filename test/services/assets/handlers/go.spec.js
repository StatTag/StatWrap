import fs from 'fs';
import GoHandler from '../../../../app/services/assets/handlers/go';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('GoHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new GoHandler().id()).toEqual(`StatWrap.${GoHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include Go files and exclude others', () => {
        const handler = new GoHandler();
        // Valid files
        expect(handler.includeFile('/path/to/main.go')).toBeTruthy();
        expect(handler.includeFile('/path/to/utils.GO')).toBeTruthy();

        // Invalid files
        expect(handler.includeFile('/path/to/main.exe')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.py')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile('/path/to/main.go.bak')).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should extract single line import statements', () => {
        const libraries = new GoHandler().getLibraries(
          'test.uri',
          'import "fmt"\nimport "os"'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'fmt',
          module: 'fmt',
          import: 'fmt',
          alias: null,
        });
        expect(libraries[1]).toMatchObject({
          id: 'os',
          module: 'os',
          import: 'os',
          alias: null,
        });
      });

      it('should extract aliased single line imports', () => {
        const libraries = new GoHandler().getLibraries(
          'test.uri',
          'import f "fmt"'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'fmt',
          alias: 'f',
        });
      });

      it('should extract multi line block import statements', () => {
        const libraries = new GoHandler().getLibraries(
          'test.uri',
          `import (
            "fmt"
            "os"
            "github.com/user/project/pkg"
          )`
        );
        expect(libraries.length).toEqual(3);
        expect(libraries[0]).toMatchObject({
          id: 'fmt',
        });
        expect(libraries[1]).toMatchObject({
          id: 'os',
        });
        expect(libraries[2]).toMatchObject({
          id: 'github.com/user/project/pkg',
        });
      });

      it('should extract multi line block import statements with aliases', () => {
        const libraries = new GoHandler().getLibraries(
          'test.uri',
          `import (
            f "fmt"
            log "github.com/sirupsen/logrus"
          )`
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'fmt',
          alias: 'f'
        });
        expect(libraries[1]).toMatchObject({
          id: 'github.com/sirupsen/logrus',
          alias: 'log'
        });
      });
    });

    describe('getInputs', () => {
      it('should detect file read operations', () => {
        const inputs = new GoHandler().getInputs(
          'test.uri',
          'file, err := os.Open("input.txt")'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read - "input.txt"',
          type: 'data',
          path: '"input.txt"',
        });
      });

      it('should detect various file read classes', () => {
        const inputs = new GoHandler().getInputs(
          'test.uri',
          `
          file1, _ := os.Open("input1.txt")
          data1, _ := ioutil.ReadFile("input2.txt")
          data2, _ := os.ReadFile("input3.txt")
          `
        );
        expect(inputs.length).toEqual(3);
        expect(inputs[0].path).toEqual('"input1.txt"');
        expect(inputs[1].path).toEqual('"input2.txt"');
        expect(inputs[2].path).toEqual('"input3.txt"');
      });

      it('should detect SQL database connections', () => {
        const inputs = new GoHandler().getInputs(
          'test.uri',
          'db, err := sql.Open("postgres", "postgres://user:pass@localhost/db")'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'DB Conn - "postgres://user:pass@localhost/db"',
          type: 'data',
          path: '"postgres://user:pass@localhost/db"',
        });
      });
    });

    describe('getOutputs', () => {
      it('should detect file write operations', () => {
        const outputs = new GoHandler().getOutputs(
          'test.uri',
          `
          file, err := os.Create("output1.txt")
          err = os.WriteFile("output2.txt", data, 0644)
          err = ioutil.WriteFile("output3.txt", data, 0644)
          `
        );
        expect(outputs.length).toEqual(3);
        expect(outputs[0].path).toEqual('"output1.txt"');
        expect(outputs[1].path).toEqual('"output2.txt"');
        expect(outputs[2].path).toEqual('"output3.txt"');
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Go file', () => {
        fs.readFileSync.mockReturnValue('import "fmt"\nfunc main() {}');

        const testAsset = {
          uri: '/path/to/main.go',
          type: 'file',
          metadata: [],
        };

        const response = new GoHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.GoHandler',
          libraries: [
            {
              id: 'fmt',
            }
          ]
        });
      });
    });
  });
});
