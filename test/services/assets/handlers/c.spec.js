import fs from 'fs';
import CHandler from '../../../../app/services/assets/handlers/c';

jest.mock('fs');

describe('services', () => {
  describe('CHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new CHandler().id()).toEqual(`StatWrap.${CHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include C files and headers and exclude others', () => {
        const handler = new CHandler();
        expect(handler.includeFile('/path/to/main.c')).toBeTruthy();
        expect(handler.includeFile('/path/to/utils.H')).toBeTruthy();

        expect(handler.includeFile('/path/to/main.cpp')).toBeFalsy();
        expect(handler.includeFile('/path/to/main.py')).toBeFalsy();
        expect(handler.includeFile('/path/to/main.c.bak')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should extract system and local include directives', () => {
        const libraries = new CHandler().getLibraries(
          'test.uri',
          '#include <stdio.h>\n#include "my_utils.h"\n # include <stdlib.h>'
        );
        expect(libraries.length).toEqual(3);
        expect(libraries[0]).toMatchObject({ id: 'stdio.h' });
        expect(libraries[1]).toMatchObject({ id: 'my_utils.h' });
        expect(libraries[2]).toMatchObject({ id: 'stdlib.h' });
      });
    });

    describe('getInputs', () => {
      it('should detect read modes in fopen/freopen/open', () => {
        const inputs = new CHandler().getInputs(
          'test.uri',
          `
          FILE *f1 = fopen("input.csv", "r");
          FILE *f2 = freopen("log.txt", "r+", stdin);
          int fd = open("raw.dat", O_RDONLY);
          int fd2 = open("rw.dat", O_RDWR | O_CREAT, 0644);
          `
        );
        expect(inputs.length).toEqual(4);
        expect(inputs[0]).toMatchObject({ path: '"input.csv"' });
        expect(inputs[1]).toMatchObject({ path: '"log.txt"' });
        expect(inputs[2]).toMatchObject({ path: '"raw.dat"' });
        expect(inputs[3]).toMatchObject({ path: '"rw.dat"' });
      });
    });

    describe('getOutputs', () => {
      it('should detect write modes in fopen/freopen/open/creat', () => {
        const outputs = new CHandler().getOutputs(
          'test.uri',
          `
          FILE *f1 = fopen("out.csv", "w");
          FILE *f2 = freopen("append.log", "a+", stdout);
          int fd = open("created.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
          int fd2 = creat("binary.bin", 0644);
          `
        );
        expect(outputs.length).toEqual(4);
        expect(outputs[0]).toMatchObject({ path: '"out.csv"' });
        expect(outputs[1]).toMatchObject({ path: '"append.log"' });
        expect(outputs[2]).toMatchObject({ path: '"created.txt"' });
        expect(outputs[3]).toMatchObject({ path: '"binary.bin"' });
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid C file', () => {
        fs.readFileSync.mockReturnValue(
          '#include <stdio.h>\nFILE *f = fopen("input.txt", "r");\nFILE *o = fopen("out.txt", "w");'
        );

        const testAsset = {
          uri: '/path/to/main.c',
          type: 'file',
          metadata: [],
        };

        const response = new CHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.CHandler',
          libraries: expect.arrayContaining([
            expect.objectContaining({ id: 'stdio.h' }),
          ]),
          inputs: expect.arrayContaining([
            expect.objectContaining({ path: '"input.txt"' }),
          ]),
          outputs: expect.arrayContaining([
            expect.objectContaining({ path: '"out.txt"' }),
          ]),
        });
      });
    });
  });
});
