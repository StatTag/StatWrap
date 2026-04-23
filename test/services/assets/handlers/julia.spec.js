import fs from 'fs';
import JuliaHandler from '../../../../app/services/assets/handlers/julia';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('JuliaHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new JuliaHandler().id()).toEqual(`StatWrap.${JuliaHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include .jl files and exclude others', () => {
        const handler = new JuliaHandler();
        expect(handler.includeFile('/path/to/script.jl')).toBeTruthy();
        expect(handler.includeFile('/path/to/script.JL')).toBeTruthy();
        expect(handler.includeFile('/path/to/script.py')).toBeFalsy();
        expect(handler.includeFile('/path/to/script.r')).toBeFalsy();
        expect(handler.includeFile('/path/to/script.js')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should return empty array for empty text', () => {
        expect(new JuliaHandler().getLibraries('test.uri', '')).toEqual([]);
        expect(new JuliaHandler().getLibraries('test.uri', null)).toEqual([]);
      });

      it('should detect using statements', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'using DataFrames');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'DataFrames',
          import: null,
        });
      });

      it('should detect using statements with specific imports', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'using CSV: read, write'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'CSV',
          import: 'read, write',
        });
      });

      it('should detect import statements', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'import Plots');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'Plots',
          import: null,
          alias: null,
        });
      });

      it('should detect import with alias', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'import DataFrames as DF'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'DataFrames',
          alias: 'DF',
        });
      });

      it('should detect import with specific functions', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'import Statistics: mean, std'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'Statistics',
          import: 'mean, std',
        });
      });

      it('should not detect commented-out imports', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          '# using DataFrames\n# import Plots'
        );
        expect(libraries.length).toEqual(0);
      });

      it('should detect multiple imports', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'using CSV\nusing DataFrames\nimport Plots'
        );
        expect(libraries.length).toEqual(3);
      });

      it('should not duplicate modules already captured by using', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'using CSV\nimport CSV'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0].module).toEqual('CSV');
      });
    });

    describe('getInputs', () => {
      it('should return empty array for empty text', () => {
        expect(new JuliaHandler().getInputs('test.uri', '')).toEqual([]);
        expect(new JuliaHandler().getInputs('test.uri', null)).toEqual([]);
      });

      it('should detect open for reading (no mode)', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "f = open(\"data.csv\")"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'open - "data.csv"',
          type: Constants.DependencyType.DATA,
          path: '"data.csv"',
        });
      });

      it('should detect open with explicit read mode', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "f = open(\"input.txt\", \"r\")"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect read()', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "content = read(\"data.json\", String)"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'read - "data.json"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect readlines()', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "lines = readlines(\"input.txt\")"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect CSV.read()', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "df = CSV.read(\"data.csv\", DataFrame)"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'CSV.read - "data.csv"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect CSV.File()', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "df = DataFrame(CSV.File(\"data.csv\"))"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect load()', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "data = load(\"results.jld2\")"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'load - "results.jld2"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should not duplicate the same path', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "read(\"data.csv\", String)\nread(\"data.csv\", String)"
        );
        expect(inputs.length).toEqual(1);
      });

      it('should not detect commented-out reads', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "# read(\"data.csv\", String)"
        );
        expect(inputs.length).toEqual(0);
      });
    });

    describe('getOutputs', () => {
      it('should return empty array for empty text', () => {
        expect(new JuliaHandler().getOutputs('test.uri', '')).toEqual([]);
        expect(new JuliaHandler().getOutputs('test.uri', null)).toEqual([]);
      });

      it('should detect open with write mode', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "f = open(\"output.txt\", \"w\")"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'open - "output.txt"',
          type: Constants.DependencyType.DATA,
          path: '"output.txt"',
        });
      });

      it('should detect open with append mode', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "f = open(\"log.txt\", \"a\")"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect write()', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "write(\"output.txt\", content)"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'write - "output.txt"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect CSV.write()', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "CSV.write(\"results.csv\", df)"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'CSV.write - "results.csv"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect savefig() as a figure output', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "savefig(\"plot.png\")"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'savefig - "plot.png"',
          type: Constants.DependencyType.FIGURE,
        });
      });

      it('should detect save()', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "save(\"results.jld2\", \"data\", data)"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'save - "results.jld2"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should not duplicate the same path', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "write(\"out.csv\", data)\nwrite(\"out.csv\", data)"
        );
        expect(outputs.length).toEqual(1);
      });

      it('should not detect commented-out writes', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "# write(\"out.csv\", data)"
        );
        expect(outputs.length).toEqual(0);
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Julia file', () => {
        fs.readFileSync.mockReturnValue(
          "using CSV\nusing DataFrames\ndf = CSV.read(\"input.csv\", DataFrame)\nCSV.write(\"output.csv\", df)"
        );
        const testAsset = {
          uri: '/path/to/analysis.jl',
          type: 'file',
          metadata: [],
        };
        const response = new JuliaHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.JuliaHandler',
          libraries: [{ module: 'CSV' }, { module: 'DataFrames' }],
          inputs: [{ type: Constants.DependencyType.DATA }],
          outputs: [{ type: Constants.DependencyType.DATA }],
        });
      });
    });
  });
});
