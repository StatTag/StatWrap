import fs from 'fs';
import CppHandler from '../../../../app/services/assets/handlers/cpp';

jest.mock('fs');

describe('services', () => {
  describe('CppHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new CppHandler().id()).toEqual(`StatWrap.${CppHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include C++ files and exclude others', () => {
        const handler = new CppHandler();
        expect(handler.includeFile('/path/to/test.cpp')).toBeTruthy();
        expect(handler.includeFile('/path/to/test.CXX')).toBeTruthy();
        expect(handler.includeFile('/path/to/test.hpp')).toBeTruthy();
        expect(handler.includeFile('/path/to/test.h')).toBeTruthy();
        expect(handler.includeFile('/path/to/test.ipp')).toBeTruthy();
        expect(handler.includeFile('/path/to/test.tpp')).toBeTruthy();
        expect(handler.includeFile('/path/to/test.inl')).toBeTruthy();
        expect(handler.includeFile('/path/to/test.c')).toBeFalsy();
        expect(handler.includeFile('/path/to/test.cpp.bak')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should detect #include imports', () => {
        const libraries = new CppHandler().getLibraries(
          'test.uri',
          '#include <vector>\n#include "my/header.hpp"',
        );

        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({
          id: 'vector',
          module: 'system',
          import: 'vector',
          alias: null,
        });
        expect(libraries[1]).toMatchObject({
          id: 'my/header.hpp',
          module: 'local',
          import: 'my/header.hpp',
          alias: null,
        });
      });
    });

    describe('getInputs', () => {
      it('should detect stream and C stdio read operations', () => {
        const inputs = new CppHandler().getInputs(
          'test.uri',
          `
          std::ifstream inFile("C:\\data\\input1.csv");
          std::fstream ioFile("/var/data/input2.csv", std::ios::in);
          dataStream.open("../data/input3.csv", std::ios::in);
          FILE* fp = fopen("data/input4.csv", "r");
          `,
        );

        expect(inputs.length).toEqual(4);
        expect(inputs[0].id).toContain('ifstream');
        expect(inputs[1].id).toContain('fstream');
        expect(inputs[2].id).toContain('open');
        expect(inputs[3].id).toContain('fopen');
        expect(inputs.map((input) => input.path)).toEqual([
          'C:\\data\\input1.csv',
          '/var/data/input2.csv',
          '../data/input3.csv',
          'data/input4.csv',
        ]);
      });

      it('should detect POSIX open read operations', () => {
        const inputs = new CppHandler().getInputs(
          'test.uri',
          'int fd = open("/etc/input_posix.txt", O_RDONLY);\nint fd2 = open("./input_rw.txt", O_RDWR);',
        );

        expect(inputs.length).toEqual(2);
        expect(inputs[0].id).toContain('open');
        expect(inputs[1].id).toContain('open');
        expect(inputs.map((input) => input.path)).toEqual(['/etc/input_posix.txt', './input_rw.txt']);
      });
    });

    describe('getOutputs', () => {
      it('should detect stream and C stdio write operations', () => {
        const outputs = new CppHandler().getOutputs(
          'test.uri',
          `
          std::ofstream outFile("C:\\tmp\\output1.csv");
          std::fstream ioFile("/var/tmp/output2.csv", std::ios::out);
          dataStream.open("../output3.csv", std::ios::app);
          FILE* fp = fopen("output4.csv", "w+");
          `,
        );

        expect(outputs.length).toEqual(4);
        expect(outputs[0].id).toContain('ofstream');
        expect(outputs[1].id).toContain('fstream');
        expect(outputs[2].id).toContain('open');
        expect(outputs[3].id).toContain('fopen');
        expect(outputs.map((output) => output.path)).toEqual([
          'C:\\tmp\\output1.csv',
          '/var/tmp/output2.csv',
          '../output3.csv',
          'output4.csv',
        ]);
      });

      it('should detect POSIX open and creat write operations', () => {
        const outputs = new CppHandler().getOutputs(
          'test.uri',
          'int fd = open("/var/output_posix.txt", O_WRONLY | O_CREAT);\nint fd2 = creat("./created_output.txt", 0644);',
        );

        expect(outputs.length).toEqual(2);
        expect(outputs[0].id).toContain('open');
        expect(outputs[1].id).toContain('creat');
        expect(outputs.map((output) => output.path)).toEqual([
          '/var/output_posix.txt',
          './created_output.txt',
        ]);
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid C++ file', () => {
        fs.readFileSync.mockReturnValue(
          '#include <iostream>\nstd::ifstream in("input.txt");\nstd::ofstream out("output.txt");',
        );

        const testAsset = {
          uri: '/path/to/main.cpp',
          type: 'file',
          metadata: [],
        };

        const response = new CppHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.CppHandler',
        });
        expect(response.metadata[0].libraries.length).toEqual(1);
        expect(response.metadata[0].inputs.length).toEqual(1);
        expect(response.metadata[0].outputs.length).toEqual(1);
      });
    });
  });
});