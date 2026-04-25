import fs from 'fs';
import CSharpHandler from '../../../../app/services/assets/handlers/csharp';

jest.mock('fs');

describe('services', () => {
  describe('CSharpHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new CSharpHandler().id()).toEqual(`StatWrap.${CSharpHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include C# files and exclude others', () => {
        const handler = new CSharpHandler();
        expect(handler.includeFile('/path/to/main.cs')).toBeTruthy();
        expect(handler.includeFile('/path/to/script.CSX')).toBeTruthy();

        expect(handler.includeFile('/path/to/main.cpp')).toBeFalsy();
        expect(handler.includeFile('/path/to/main.cs.bak')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should detect using statements including aliases', () => {
        const libraries = new CSharpHandler().getLibraries(
          'test.uri',
          `
          using System;
          using System.IO;
          using IO = System.IO;
          using static System.Math;
          `,
        );

        expect(libraries.length).toEqual(4);
        expect(libraries).toEqual(
          expect.arrayContaining([
            {
              id: 'System',
              module: 'System',
              import: null,
              alias: null,
            },
            {
              id: 'System.IO',
              module: 'System',
              import: 'IO',
              alias: null,
            },
            {
              id: 'System.IO',
              module: 'System',
              import: 'IO',
              alias: 'IO',
            },
            {
              id: 'System.Math',
              module: 'System',
              import: 'Math',
              alias: null,
            },
          ]),
        );
      });

      it('should detect deeply nested using statements', () => {
        const libraries = new CSharpHandler().getLibraries(
          'test.uri',
          'using Package.SubPackage.SubSubPackage.SubSubSubPackage;',
        );

        expect(libraries).toEqual([
          {
            id: 'Package.SubPackage.SubSubPackage.SubSubSubPackage',
            module: 'Package.SubPackage.SubSubPackage',
            import: 'SubSubSubPackage',
            alias: null,
          },
        ]);
      });
    });

    describe('getInputs', () => {
      it('should detect common C# file reads', () => {
        const inputs = new CSharpHandler().getInputs(
          'test.uri',
          `
          var txt = File.ReadAllText("input1.txt");
          var bytes = File.ReadAllBytes("input2.bin");
          using var sr = new StreamReader("input3.txt");
          using var fs = new FileStream("input4.txt", FileMode.Open);
          `,
        );

        expect(inputs.length).toEqual(4);
        expect(inputs[0].path).toEqual('"input1.txt"');
        expect(inputs[1].path).toEqual('"input2.bin"');
        expect(inputs[2].path).toEqual('"input3.txt"');
        expect(inputs[3].path).toEqual('"input4.txt"');
      });

      it('should detect async and additional File read methods', () => {
        const inputs = new CSharpHandler().getInputs(
          'test.uri',
          `
          var text = await File.ReadAllTextAsync("inputAsync1.txt");
          var bytes = await File.ReadAllBytesAsync("inputAsync2.bin");
          var lines = File.ReadLines("inputLines.txt");
          using var tr = File.OpenText("inputOpenText.txt");
          `,
        );

        expect(inputs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '"inputAsync1.txt"' }),
            expect.objectContaining({ path: '"inputAsync2.bin"' }),
            expect.objectContaining({ path: '"inputLines.txt"' }),
            expect.objectContaining({ path: '"inputOpenText.txt"' }),
          ]),
        );
      });
    });

    describe('getOutputs', () => {
      it('should detect common C# file writes', () => {
        const outputs = new CSharpHandler().getOutputs(
          'test.uri',
          `
          File.WriteAllText("output1.txt", "x");
          File.AppendAllText("output2.log", "x");
          using var sw = new StreamWriter("output3.txt");
          using var fs = new FileStream("output4.txt", FileMode.Create);
          `,
        );

        expect(outputs.length).toEqual(4);
        expect(outputs[0].path).toEqual('"output1.txt"');
        expect(outputs[1].path).toEqual('"output2.log"');
        expect(outputs[2].path).toEqual('"output3.txt"');
        expect(outputs[3].path).toEqual('"output4.txt"');
      });

      it('should detect async and additional File write methods', () => {
        const outputs = new CSharpHandler().getOutputs(
          'test.uri',
          `
          await File.WriteAllTextAsync("outputAsync1.txt", "x");
          await File.AppendAllTextAsync("outputAsync2.log", "x");
          await File.WriteAllLinesAsync("outputAsync3.txt", new[] { "x" });
          await File.AppendAllBytesAsync("outputAsync4.bin", bytes);
          File.AppendText("outputAppendText.txt");
          File.CreateText("outputCreateText.txt");
          `,
        );

        expect(outputs).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ path: '"outputAsync1.txt"' }),
            expect.objectContaining({ path: '"outputAsync2.log"' }),
            expect.objectContaining({ path: '"outputAsync3.txt"' }),
            expect.objectContaining({ path: '"outputAsync4.bin"' }),
            expect.objectContaining({ path: '"outputAppendText.txt"' }),
            expect.objectContaining({ path: '"outputCreateText.txt"' }),
          ]),
        );
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid C# file', () => {
        fs.readFileSync.mockReturnValue(
          'using System.IO;\nFile.ReadAllText("input.txt");\nFile.WriteAllText("output.txt", "x");',
        );

        const testAsset = {
          uri: '/path/to/main.cs',
          type: 'file',
          metadata: [],
        };

        const response = new CSharpHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.CSharpHandler',
          libraries: expect.arrayContaining([expect.objectContaining({ id: 'System.IO' })]),
          inputs: expect.arrayContaining([expect.objectContaining({ path: '"input.txt"' })]),
          outputs: expect.arrayContaining([expect.objectContaining({ path: '"output.txt"' })]),
        });
      });
    });
  });
});
