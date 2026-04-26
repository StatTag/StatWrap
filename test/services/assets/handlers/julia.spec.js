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
        expect(libraries[0]).toMatchObject({ module: 'DataFrames', import: null });
      });

      it('should detect using statements with specific imports', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'using CSV: read, write');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({ module: 'CSV', import: 'read, write' });
      });

      it('should detect comma-separated using statements', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'using CSV, DataFrames, Statistics');
        expect(libraries.length).toEqual(3);
        expect(libraries[0]).toMatchObject({ module: 'CSV', import: null });
        expect(libraries[1]).toMatchObject({ module: 'DataFrames', import: null });
        expect(libraries[2]).toMatchObject({ module: 'Statistics', import: null });
      });

      it('should detect import statements', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'import Plots');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({ module: 'Plots', import: null, alias: null });
      });

      it('should detect import with alias', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'import DataFrames as DF');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({ module: 'DataFrames', alias: 'DF' });
      });

      it('should detect import with specific functions', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'import Statistics: mean, std');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({ module: 'Statistics', import: 'mean, std' });
      });

      it('should detect comma-separated import statements', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'import CSV, DataFrames');
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({ module: 'CSV', import: null });
        expect(libraries[1]).toMatchObject({ module: 'DataFrames', import: null });
      });

      it('should detect mutating functions (bang) in import list', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'using DataStructures: push!, pop!, peek!'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          module: 'DataStructures',
          import: 'push!, pop!, peek!',
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
        const libraries = new JuliaHandler().getLibraries('test.uri', 'using CSV\nimport CSV');
        expect(libraries.length).toEqual(1);
        expect(libraries[0].module).toEqual('CSV');
      });

      it('should treat consecutive using statements as separate entries', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'using Base: show, print, println, string\nusing Statistics: mean, median, std, var, quantile'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({ module: 'Base', import: 'show, print, println, string' });
        expect(libraries[1]).toMatchObject({ module: 'Statistics', import: 'mean, median, std, var, quantile' });
      });

      it('should handle relative module imports with dot prefix', () => {
        const libraries = new JuliaHandler().getLibraries('test.uri', 'using ..Statistics: mean, std');
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({ module: '..Statistics', import: 'mean, std' });
      });

      it('should not include export or subsequent lines in the import list', () => {
        const libraries = new JuliaHandler().getLibraries(
          'test.uri',
          'using ..Statistics: mean, std\nexport compute_mean, compute_variance'
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({ module: '..Statistics', import: 'mean, std' });
      });
    });

    describe('getInputs', () => {
      it('should return empty array for empty text', () => {
        expect(new JuliaHandler().getInputs('test.uri', '')).toEqual([]);
        expect(new JuliaHandler().getInputs('test.uri', null)).toEqual([]);
      });

      it('should detect open for reading (no mode)', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'f = open("data.csv")');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'open - "data.csv"',
          type: Constants.DependencyType.DATA,
          path: '"data.csv"',
        });
      });

      it('should detect open with explicit read mode', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'f = open("input.txt", "r")');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ type: Constants.DependencyType.DATA });
      });

      it('should detect open with do-block for reading', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "open(\"input.txt\") do file\n  for line in eachline(file)\n    process(line)\n  end\nend"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'open - "input.txt"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect open with explicit read mode using do-block', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "open(\"input.txt\", \"r\") do io\n  data = read(io, String)\nend"
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ type: Constants.DependencyType.DATA });
      });

      it('should not classify open with write mode as an input', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          "open(\"/data/pipeline/category_summary.csv\", \"w\") do io\n  println(io, data)\nend"
        );
        expect(inputs.length).toEqual(0);
      });

      it('should detect read()', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'content = read("data.json", String)');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ id: 'read - "data.json"', type: Constants.DependencyType.DATA });
      });

      it('should detect readlines()', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'lines = readlines("input.txt")');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ type: Constants.DependencyType.DATA });
      });

      it('should detect CSV.read()', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'df = CSV.read("data.csv", DataFrame)');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ id: 'CSV.read - "data.csv"', type: Constants.DependencyType.DATA });
      });

      it('should detect CSV.File()', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'df = DataFrame(CSV.File("data.csv"))');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ type: Constants.DependencyType.DATA });
      });

      it('should detect readdlm()', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', "data = readdlm(\"input.csv\", ',')");
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ id: 'readdlm - "input.csv"', type: Constants.DependencyType.DATA });
      });

      it('should detect deserialize()', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'model = deserialize("model.bin")');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'deserialize - "model.bin"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect load()', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', 'data = load("results.jld2")');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ id: 'load - "results.jld2"', type: Constants.DependencyType.DATA });
      });

      it('should detect @load macro', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', '@load "checkpoint.jld2"');
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ id: 'load - "checkpoint.jld2"', type: Constants.DependencyType.DATA });
      });

      it('should not detect preload() or reload() as load inputs', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          'preload("data.bin")\nreload("module.jl")'
        );
        expect(inputs.length).toEqual(0);
      });

      it('should not duplicate the same path', () => {
        const inputs = new JuliaHandler().getInputs(
          'test.uri',
          'read("data.csv", String)\nread("data.csv", String)'
        );
        expect(inputs.length).toEqual(1);
      });

      it('should not detect commented-out reads', () => {
        const inputs = new JuliaHandler().getInputs('test.uri', '# read("data.csv", String)');
        expect(inputs.length).toEqual(0);
      });
    });

    describe('getOutputs', () => {
      it('should return empty array for empty text', () => {
        expect(new JuliaHandler().getOutputs('test.uri', '')).toEqual([]);
        expect(new JuliaHandler().getOutputs('test.uri', null)).toEqual([]);
      });

      it('should detect open with write mode', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'f = open("output.txt", "w")');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'open - "output.txt"',
          type: Constants.DependencyType.DATA,
          path: '"output.txt"',
        });
      });

      it('should detect open with write mode using do-block syntax', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "open(\"/data/pipeline/category_summary.csv\", \"w\") do io\n  println(io, data)\nend"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'open - "/data/pipeline/category_summary.csv"',
          type: Constants.DependencyType.DATA,
          path: '"/data/pipeline/category_summary.csv"',
        });
      });

      it('should detect open with append mode', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'f = open("log.txt", "a")');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ type: Constants.DependencyType.DATA });
      });

      it('should detect write()', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'write("output.txt", content)');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ id: 'write - "output.txt"', type: Constants.DependencyType.DATA });
      });

      it('should detect CSV.write()', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'CSV.write("results.csv", df)');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'CSV.write - "results.csv"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect writedlm()', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          "writedlm(\"output.csv\", data, ',')"
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'writedlm - "output.csv"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect savefig() as a figure output', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'savefig("plot.png")');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ id: 'savefig - "plot.png"', type: Constants.DependencyType.FIGURE });
      });

      it('should detect serialize()', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'serialize("model.bin", model)');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'serialize - "model.bin"',
          type: Constants.DependencyType.DATA,
        });
      });

      it('should detect save()', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'save("results.jld2", "data", data)');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ id: 'save - "results.jld2"', type: Constants.DependencyType.DATA });
      });

      it('should detect @save macro', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', '@save "checkpoint.jld2" model');
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ id: 'save - "checkpoint.jld2"', type: Constants.DependencyType.DATA });
      });

      it('should not detect savefig() as a save output', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', 'savefig("plot.png")');
        expect(outputs.filter((o) => o.id.startsWith('save -')).length).toEqual(0);
      });

      it('should not duplicate the same path', () => {
        const outputs = new JuliaHandler().getOutputs(
          'test.uri',
          'write("out.csv", data)\nwrite("out.csv", data)'
        );
        expect(outputs.length).toEqual(1);
      });

      it('should not detect commented-out writes', () => {
        const outputs = new JuliaHandler().getOutputs('test.uri', '# write("out.csv", data)');
        expect(outputs.length).toEqual(0);
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Julia file', () => {
        fs.readFileSync.mockReturnValue(
          'using CSV\nusing DataFrames\ndf = CSV.read("input.csv", DataFrame)\nCSV.write("output.csv", df)'
        );
        const testAsset = { uri: '/path/to/analysis.jl', type: 'file', metadata: [] };
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
