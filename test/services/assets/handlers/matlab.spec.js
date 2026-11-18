import fs from 'fs';
import MatlabHandler from '../../../../app/services/assets/handlers/matlab';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('MatlabHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new MatlabHandler().id()).toEqual(`StatWrap.${MatlabHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include .m files and exclude others', () => {
        const handler = new MatlabHandler();
        expect(handler.includeFile('/path/to/script.m')).toBeTruthy();
        expect(handler.includeFile('/path/to/script.M')).toBeTruthy();
        expect(handler.includeFile('/path/to/script.mat')).toBeFalsy();
        expect(handler.includeFile('/path/to/script.py')).toBeFalsy();
        expect(handler.includeFile('/path/to/script.r')).toBeFalsy();
        expect(handler.includeFile('/path/to/script.jl')).toBeFalsy();
        expect(handler.includeFile('/path/to/.m')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should return empty array for empty or blank text', () => {
        expect(new MatlabHandler().getLibraries('test.m', '')).toEqual([]);
        expect(new MatlabHandler().getLibraries('test.m', null)).toEqual([]);
        expect(new MatlabHandler().getLibraries('test.m', '   ')).toEqual([]);
      });

      it('should detect import statements with classes and wildcards', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          'import matlab.net.http.*\nimport containers.Map',
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'matlab.net.http.*',
          package: 'matlab.net.http',
          import: '*',
        });
        expect(libraries[1]).toMatchObject({
          id: 'containers.Map',
          package: 'containers',
          import: 'Map',
        });
      });

      it('should detect multiple imports on a single line', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          'import pkg1.ClassA pkg2.ClassB',
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({ id: 'pkg1.ClassA' });
        expect(libraries[1]).toMatchObject({ id: 'pkg2.ClassB' });
      });

      it('should detect functional addpath statements', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          "addpath('utilities')\naddpath(\"helpers\")\naddpath(genpath('models'))",
        );
        expect(libraries.length).toEqual(3);
        expect(libraries[0]).toMatchObject({ id: "addpath - 'utilities'", package: "'utilities'" });
        expect(libraries[1]).toMatchObject({ id: 'addpath - "helpers"', package: '"helpers"' });
        expect(libraries[2]).toMatchObject({ id: "addpath - 'models'", package: "'models'" });
      });

      it('should detect command-form addpath statements', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          'addpath src/utils\naddpath ../common',
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({ id: 'addpath - src/utils', package: 'src/utils' });
        expect(libraries[1]).toMatchObject({ id: 'addpath - ../common', package: '../common' });
      });

      it('should ignore commented imports and addpath', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          "% import ignored.pkg.*\n# import octave.ignored.*\n% addpath('ignored')\n%{ \nimport blocked.pkg.*\n%}",
        );
        expect(libraries.length).toEqual(0);
      });

      it('should strip inline comments on import statements and ignore import inside strings', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          "import matlab.net.http.* % used for HTTP\ntitle('Data import summary');\ndisp('Please import data');",
        );
        expect(libraries.length).toEqual(1);
        expect(libraries[0]).toMatchObject({
          id: 'matlab.net.http.*',
          package: 'matlab.net.http',
          import: '*',
        });
      });

      it('should ignore position flags in addpath and extract directory arguments', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          "addpath('-end', 'mydir')\naddpath('dir1', 'dir2', '-begin')\naddpath utils -end",
        );
        expect(libraries.map((l) => l.id)).toEqual([
          'addpath - utils',
          "addpath - 'mydir'",
          "addpath - 'dir1'",
          "addpath - 'dir2'",
        ]);
      });

      it('should support functional import, quoted command addpath, and ignore invalid import syntax', () => {
        const libraries = new MatlabHandler().getLibraries(
          'test.m',
          [
            "import('matlab.net.http.*')",
            "addpath 'my utils' -end",
            'import = 5;',
            'disp("C:\\\\data\\\\"); import pkg.RealClass;',
          ].join('\n'),
        );
        expect(libraries.map((l) => l.id)).toEqual([
          "addpath - 'my utils'",
          'pkg.RealClass',
          'matlab.net.http.*',
        ]);
      });
    });

    describe('getInputs', () => {
      it('should return empty array for empty or blank text', () => {
        expect(new MatlabHandler().getInputs('test.m', '')).toEqual([]);
        expect(new MatlabHandler().getInputs('test.m', null)).toEqual([]);
      });

      it('should detect modern table and matrix reading functions', () => {
        const code = `
          T = readtable('data.csv');
          M = readmatrix("matrix.txt");
          C = readcell('cells.xlsx');
          V = readvars('vars.dat');
          TT = readtimetable('timeseries.csv');
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.length).toEqual(5);
        expect(inputs[0]).toMatchObject({
          id: "readtable - 'data.csv'",
          type: Constants.DependencyType.DATA,
          path: "'data.csv'",
        });
        expect(inputs[1]).toMatchObject({
          id: 'readmatrix - "matrix.txt"',
          type: Constants.DependencyType.DATA,
          path: '"matrix.txt"',
        });
        expect(inputs[2]).toMatchObject({ id: "readcell - 'cells.xlsx'", type: Constants.DependencyType.DATA });
        expect(inputs[3]).toMatchObject({ id: "readvars - 'vars.dat'", type: Constants.DependencyType.DATA });
        expect(inputs[4]).toMatchObject({ id: "readtimetable - 'timeseries.csv'", type: Constants.DependencyType.DATA });
      });

      it('should detect legacy and utility reading functions', () => {
        const code = `
          c = csvread('input.csv');
          d = dlmread('delim.txt');
          t = textread('text.txt');
          x = xlsread('excel.xlsx');
          i = importdata('raw.dat');
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.length).toEqual(5);
        expect(inputs[0]).toMatchObject({ id: "csvread - 'input.csv'", type: Constants.DependencyType.DATA });
        expect(inputs[1]).toMatchObject({ id: "dlmread - 'delim.txt'", type: Constants.DependencyType.DATA });
        expect(inputs[2]).toMatchObject({ id: "textread - 'text.txt'", type: Constants.DependencyType.DATA });
        expect(inputs[3]).toMatchObject({ id: "xlsread - 'excel.xlsx'", type: Constants.DependencyType.DATA });
        expect(inputs[4]).toMatchObject({ id: "importdata - 'raw.dat'", type: Constants.DependencyType.DATA });
      });

      it('should detect workspace load (function and command syntax)', () => {
        const code = `
          load('workspace.mat');
          load("experiment.mat");
          load model.mat
          load data.txt
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.length).toEqual(4);
        expect(inputs[0]).toMatchObject({ id: "load - 'workspace.mat'", type: Constants.DependencyType.DATA });
        expect(inputs[1]).toMatchObject({ id: 'load - "experiment.mat"', type: Constants.DependencyType.DATA });
        expect(inputs[2]).toMatchObject({ id: 'load - model.mat', type: Constants.DependencyType.DATA, path: 'model.mat' });
        expect(inputs[3]).toMatchObject({ id: 'load - data.txt', type: Constants.DependencyType.DATA, path: 'data.txt' });
      });

      it('should detect image and audio inputs', () => {
        const code = `
          img = imread('figure1.png');
          [y, Fs] = audioread('recording.wav');
          vid = VideoReader('clip.mp4');
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.length).toEqual(3);
        expect(inputs[0]).toMatchObject({
          id: "imread - 'figure1.png'",
          type: Constants.DependencyType.FIGURE,
          path: "'figure1.png'",
        });
        expect(inputs[1]).toMatchObject({
          id: "audioread - 'recording.wav'",
          type: Constants.DependencyType.DATA,
          path: "'recording.wav'",
        });
        expect(inputs[2]).toMatchObject({
          id: "VideoReader - 'clip.mp4'",
          type: Constants.DependencyType.DATA,
          path: "'clip.mp4'",
        });
      });

      it('should detect fopen for reading (default and explicit read modes)', () => {
        const code = `
          fid1 = fopen('plain.txt');
          fid2 = fopen('stream.bin', 'r');
          fid3 = fopen("text.txt", "rt");
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.length).toEqual(3);
        expect(inputs[0]).toMatchObject({ id: "fopen - 'plain.txt'", type: Constants.DependencyType.DATA });
        expect(inputs[1]).toMatchObject({ id: "fopen - 'stream.bin'", type: Constants.DependencyType.DATA });
        expect(inputs[2]).toMatchObject({ id: 'fopen - "text.txt"', type: Constants.DependencyType.DATA });
      });

      it('should detect script execution via run', () => {
        const code = `
          run('pipeline/step1.m');
          run pipeline/step2.m
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.length).toEqual(2);
        expect(inputs[0]).toMatchObject({ id: "run - 'pipeline/step1.m'", type: Constants.DependencyType.DATA });
        expect(inputs[1]).toMatchObject({ id: 'run - pipeline/step2.m', type: Constants.DependencyType.DATA });
      });

      it('should ignore inputs inside comments and block comments', () => {
        const code = `
          % readtable('commented.csv')
          # readtable('octave_commented.csv')
          %{
            readtable('block_commented.csv');
            load block.mat
          %}
          #{
            readtable('octave_block.csv');
          #}
          T = readtable('actual.csv');
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ id: "readtable - 'actual.csv'" });
      });

      it('should handle multiple calls per line, percent inside strings, transpose quotes, and 4-arg fopen', () => {
        const code = `
          A = readtable('a.csv'); B = readmatrix('b.csv');
          disp('100% done'); C = readcell('c.xlsx');
          M = X'; T = readtable('after_transpose.csv');
          fprintf('Please run step2.m next');
          fid = fopen('encoded.txt', 'r', 'n', 'UTF-8');
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.map((i) => i.id)).toEqual([
          "readtable - 'a.csv'",
          "readmatrix - 'b.csv'",
          "readcell - 'c.xlsx'",
          "readtable - 'after_transpose.csv'",
          "fopen - 'encoded.txt'",
        ]);
      });

      it('should handle edge cases: flags in load, quoted/flag command syntax, r+b fopen, nested blocks, and reject false positives', () => {
        const code = `
          %{
            %{
              readtable('nested_inner.csv');
            %}
            readtable('nested_outer.csv');
          %}
          T1 = readtable('dir/' + 'file.csv');
          T2 = readtable('');
          fids = fopen('all');
          obj.load('method_call.mat');
          load('-mat', 'flagged.mat');
          load -ascii cmd_ascii.txt
          load 'my data.mat'
          run 'pipeline/my step.m'
          fid = fopen('rw.bin', 'r+b');
          disp("C:\\\\data\\\\"); T3 = readtable("after_backslash.csv");
        `;
        const inputs = new MatlabHandler().getInputs('test.m', code);
        expect(inputs.map((i) => i.id)).toEqual([
          "load - 'flagged.mat'",
          "fopen - 'rw.bin'",
          'readtable - "after_backslash.csv"',
          'load - cmd_ascii.txt',
          "load - 'my data.mat'",
          "run - 'pipeline/my step.m'",
        ]);
      });

      it('should safely handle malformed code and CR-only line endings without throwing', () => {
        const crOnly = "import a.b\rT = readtable('x.csv');\r% comment\rwritetable(T, 'y.csv');";
        const malformed = "readtable('unclosed\nwritetable(\n((([[[\n'unclosed\n\x00readtable(\"ok.csv\");";
        const handler = new MatlabHandler();
        expect(handler.getInputs('cr.m', crOnly).map((i) => i.id)).toEqual(["readtable - 'x.csv'"]);
        expect(handler.getOutputs('cr.m', crOnly).map((o) => o.id)).toEqual(["writetable - 'y.csv'"]);
        expect(handler.getInputs('bad.m', malformed).map((i) => i.id)).toEqual(['readtable - "ok.csv"']);
        expect(handler.getOutputs('bad.m', malformed)).toEqual([]);
      });
    });

    describe('getOutputs', () => {
      it('should return empty array for empty or blank text', () => {
        expect(new MatlabHandler().getOutputs('test.m', '')).toEqual([]);
        expect(new MatlabHandler().getOutputs('test.m', null)).toEqual([]);
      });

      it('should detect table and matrix writing functions', () => {
        const code = `
          writetable(T, 'results.csv');
          writematrix(M, "matrix_out.txt");
          writecell(C, 'cells_out.txt');
          writetimetable(TT, 'timeseries_out.csv');
          csvwrite('legacy.csv', M);
          dlmwrite('delim.txt', M);
          xlswrite('excel.xlsx', M);
        `;
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.length).toEqual(7);
        expect(outputs[0]).toMatchObject({
          id: "writetable - 'results.csv'",
          type: Constants.DependencyType.DATA,
          path: "'results.csv'",
        });
        expect(outputs[1]).toMatchObject({
          id: 'writematrix - "matrix_out.txt"',
          type: Constants.DependencyType.DATA,
        });
        expect(outputs[2]).toMatchObject({ id: "writecell - 'cells_out.txt'", type: Constants.DependencyType.DATA });
        expect(outputs[3]).toMatchObject({ id: "writetimetable - 'timeseries_out.csv'", type: Constants.DependencyType.DATA });
        expect(outputs[4]).toMatchObject({ id: "csvwrite - 'legacy.csv'", type: Constants.DependencyType.DATA });
        expect(outputs[5]).toMatchObject({ id: "dlmwrite - 'delim.txt'", type: Constants.DependencyType.DATA });
        expect(outputs[6]).toMatchObject({ id: "xlswrite - 'excel.xlsx'", type: Constants.DependencyType.DATA });
      });

      it('should detect workspace save (functional and command syntax)', () => {
        const code = `
          save('checkpoint.mat');
          save("results.mat", "var1", "var2");
          save final_model.mat
        `;
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.length).toEqual(3);
        expect(outputs[0]).toMatchObject({ id: "save - 'checkpoint.mat'", type: Constants.DependencyType.DATA });
        expect(outputs[1]).toMatchObject({ id: 'save - "results.mat"', type: Constants.DependencyType.DATA });
        expect(outputs[2]).toMatchObject({ id: 'save - final_model.mat', type: Constants.DependencyType.DATA });
      });

      it('should detect figure and visual outputs', () => {
        const code = `
          saveas(fig, 'plot.png');
          exportgraphics(ax, 'chart.pdf');
          exportapp(app, 'app_view.pdf');
          imwrite(A, 'output_image.png');
          print('figure_direct.png', '-dpng');
          print(fig, 'figure_fig.png', '-dpng');
        `;
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.length).toEqual(6);
        expect(outputs[0]).toMatchObject({
          id: "saveas - 'plot.png'",
          type: Constants.DependencyType.FIGURE,
          path: "'plot.png'",
        });
        expect(outputs[1]).toMatchObject({
          id: "exportgraphics - 'chart.pdf'",
          type: Constants.DependencyType.FIGURE,
        });
        expect(outputs[2]).toMatchObject({
          id: "exportapp - 'app_view.pdf'",
          type: Constants.DependencyType.FIGURE,
        });
        expect(outputs[3]).toMatchObject({
          id: "imwrite - 'output_image.png'",
          type: Constants.DependencyType.FIGURE,
        });
        expect(outputs[4]).toMatchObject({
          id: "print - 'figure_direct.png'",
          type: Constants.DependencyType.FIGURE,
        });
        expect(outputs[5]).toMatchObject({
          id: "print - 'figure_fig.png'",
          type: Constants.DependencyType.FIGURE,
        });
      });

      it('should detect fopen for writing and appending', () => {
        const code = `
          fid1 = fopen('output.log', 'w');
          fid2 = fopen('append.log', 'a');
          fid3 = fopen("update.bin", "w+");
        `;
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.length).toEqual(3);
        expect(outputs[0]).toMatchObject({ id: "fopen - 'output.log'", type: Constants.DependencyType.DATA });
        expect(outputs[1]).toMatchObject({ id: "fopen - 'append.log'", type: Constants.DependencyType.DATA });
        expect(outputs[2]).toMatchObject({ id: 'fopen - "update.bin"', type: Constants.DependencyType.DATA });
      });

      it('should detect audio write', () => {
        const code = "audiowrite('synth.wav', y, 44100);";
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ id: "audiowrite - 'synth.wav'", type: Constants.DependencyType.DATA });
      });

      it('should ignore outputs inside comments and block comments', () => {
        const code = `
          % save('commented.mat')
          # save('octave_commented.mat')
          %{
            writetable(T, 'block_out.csv');
            saveas(fig, 'block_plot.png');
          %}
          writetable(T, 'actual_out.csv');
        `;
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ id: "writetable - 'actual_out.csv'" });
      });

      it('should handle nested function calls in 1st arg, 3-arg print with flags, 4-arg fopen, and line continuations', () => {
        const code = `
          saveas(gcf(), 'plot_gcf.png');
          exportgraphics(gca(), 'plot_gca.pdf');
          writetable(array2table(X), 'converted.csv');
          print(fig, '-dpng', 'print_3arg.png');
          fid = fopen('out_utf8.txt', 'w', 'n', 'UTF-8');
          writematrix(M, ... multiline comment
            'continued.txt');
        `;
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.map((o) => o.id)).toEqual([
          "saveas - 'plot_gcf.png'",
          "exportgraphics - 'plot_gca.pdf'",
          "writetable - 'converted.csv'",
          "print - 'print_3arg.png'",
          "fopen - 'out_utf8.txt'",
          "writematrix - 'continued.txt'",
        ]);
      });

      it('should handle save flags, indexed imwrite, command print/save, and ignore object method calls', () => {
        const code = `
          obj.save('ignored_method.mat');
          save('-v7.3', 'versioned.mat', 'var1');
          save -v7.3 cmd_versioned.mat var1
          save 'my results.mat'
          imwrite(X, map, 'indexed.png');
          print -dpng cmd_plot.png
        `;
        const outputs = new MatlabHandler().getOutputs('test.m', code);
        expect(outputs.map((o) => o.id)).toEqual([
          "save - 'versioned.mat'",
          "imwrite - 'indexed.png'",
          'save - cmd_versioned.mat',
          "save - 'my results.mat'",
          'print - cmd_plot.png',
        ]);
      });
    });

    describe('scan', () => {
      it('should process a valid MATLAB file asset and populate metadata', () => {
        const testCode = `
          import matlab.net.http.*
          addpath('utils')
          data = readtable('input.csv');
          writetable(data, 'output.csv');
          saveas(gcf, 'plot.png');
        `;
        fs.readFileSync.mockReturnValue(testCode);

        const asset = {
          uri: '/project/analysis.m',
          type: Constants.AssetType.FILE,
          metadata: [],
        };

        const result = new MatlabHandler().scan(asset);
        expect(result.metadata.length).toEqual(1);
        const meta = result.metadata[0];
        expect(meta.id).toEqual('StatWrap.MatlabHandler');
        expect(meta.libraries.length).toEqual(2);
        expect(meta.inputs.length).toEqual(1);
        expect(meta.inputs[0].path).toEqual("'input.csv'");
        expect(meta.outputs.length).toEqual(2);
        expect(meta.outputs[0].path).toEqual("'output.csv'");
        expect(meta.outputs[1].path).toEqual("'plot.png'");
      });

      it('should handle readFileSync failure gracefully', () => {
        fs.readFileSync.mockImplementation(() => {
          throw new Error('Permission denied');
        });

        const asset = {
          uri: '/project/unreadable.m',
          type: Constants.AssetType.FILE,
          metadata: [],
        };

        const result = new MatlabHandler().scan(asset);
        expect(result.metadata.length).toEqual(1);
        expect(result.metadata[0].error).toEqual('Unable to read code file');
      });
    });
  });
});
