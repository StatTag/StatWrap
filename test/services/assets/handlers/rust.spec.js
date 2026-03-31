import fs from 'fs';
import RustHandler from '../../../../app/services/assets/handlers/rust';
import Constants from '../../../../app/constants/constants';

jest.mock('fs');

describe('services', () => {
  describe('RustHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new RustHandler().id()).toEqual(`StatWrap.${RustHandler.name}`);
      });
    });

    describe('includeFile', () => {
      it('should include rust files and exclude others', () => {
        const handler = new RustHandler();
        expect(handler.includeFile('/path/to/main.rs')).toBeTruthy();
        expect(handler.includeFile('/path/to/utils.RS')).toBeTruthy();
        
        expect(handler.includeFile('/path/to/data.csv')).toBeFalsy();
        expect(handler.includeFile('/path/to/app.py')).toBeFalsy();
        expect(handler.includeFile(null)).toBeFalsy();
        expect(handler.includeFile('/path/to/main.rs.bak')).toBeFalsy();
      });
    });

    describe('getLibraries', () => {
      it('should return an empty array for empty or null text', () => {
        const handler = new RustHandler();
        expect(handler.getLibraries('test.uri', '')).toEqual([]);
        expect(handler.getLibraries('test.uri', null)).toEqual([]);
      });

      it('should detect simple use statements', () => {
        const libraries = new RustHandler().getLibraries(
          'test.uri',
          'use std::fs;\nuse std::io as io_mod;'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({ id: 'std::fs', module: 'std', import: 'std::fs', alias: null });
        expect(libraries[1]).toMatchObject({ id: 'std::io', module: 'std', import: 'std::io', alias: 'io_mod' });
      });

      it('should detect nested use statements with braces', () => {
        const libraries = new RustHandler().getLibraries(
          'test.uri',
          'use std::io::{self, Read, Write, Result as IoResult};'
        );
        expect(libraries.length).toEqual(4);
        expect(libraries[0]).toMatchObject({ id: 'std::io', module: 'std::io', import: 'std::io', alias: null });
        expect(libraries[1]).toMatchObject({ id: 'std::io::Read', module: 'std::io', import: 'std::io::Read', alias: null });
        expect(libraries[2]).toMatchObject({ id: 'std::io::Write', module: 'std::io', import: 'std::io::Write', alias: null });
        expect(libraries[3]).toMatchObject({ id: 'std::io::Result', module: 'std::io', import: 'std::io::Result', alias: 'IoResult' });
      });

      it('should detect extern crate statements', () => {
        const libraries = new RustHandler().getLibraries(
          'test.uri',
          'extern crate serde;\nextern crate log as logging;'
        );
        expect(libraries.length).toEqual(2);
        expect(libraries[0]).toMatchObject({ id: 'serde', module: 'serde', import: 'serde', alias: null });
        expect(libraries[1]).toMatchObject({ id: 'log', module: 'log', import: 'log', alias: 'logging' });
      });
    });

    describe('getInputs', () => {
      it('should detect File::open', () => {
        const inputs = new RustHandler().getInputs(
          'test.uri',
          'let file = File::open("data/input.csv")?;'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({
          id: 'File Read (open) - "data/input.csv"',
          type: 'data',
          path: '"data/input.csv"',
        });
      });

      it('should detect fs::read and fs::read_to_string', () => {
        const inputs = new RustHandler().getInputs(
          'test.uri',
          'let content = fs::read_to_string("config.toml")?;\nlet bytes = std::fs::read("image.png")?;'
        );
        expect(inputs.length).toEqual(2);
        expect(inputs[0]).toMatchObject({ path: '"config.toml"' });
        expect(inputs[1]).toMatchObject({ path: '"image.png"' });
      });

      it('should detect BufReader::new', () => {
        const inputs = new RustHandler().getInputs(
          'test.uri',
          'let reader = BufReader::new("large_file.txt");'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ path: '"large_file.txt"' });
      });

      it('should detect SQLite Connection::open', () => {
        const inputs = new RustHandler().getInputs(
          'test.uri',
          'let conn = Connection::open("database.sqlite")?;'
        );
        expect(inputs.length).toEqual(1);
        expect(inputs[0]).toMatchObject({ path: '"database.sqlite"' });
      });
    });

    describe('getOutputs', () => {
      it('should detect File::create', () => {
        const outputs = new RustHandler().getOutputs(
          'test.uri',
          'let mut file = File::create("output.txt")?;'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({
          id: 'File Write (create) - "output.txt"',
          type: 'data',
          path: '"output.txt"',
        });
      });

      it('should detect fs::write', () => {
        const outputs = new RustHandler().getOutputs(
          'test.uri',
          'fs::write("log.txt", b"done")?;\nstd::fs::write("status.json", "{}")?;'
        );
        expect(outputs.length).toEqual(2);
        expect(outputs[0]).toMatchObject({ path: '"log.txt"' });
        expect(outputs[1]).toMatchObject({ path: '"status.json"' });
      });

      it('should detect OpenOptions::new().write(true).open()', () => {
        const outputs = new RustHandler().getOutputs(
          'test.uri',
          'let file = OpenOptions::new().write(true).append(true).open("app.log")?;'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ path: '"app.log"' });
      });

      it('should detect BufWriter::new', () => {
        const outputs = new RustHandler().getOutputs(
          'test.uri',
          'let writer = BufWriter::new("out.csv");'
        );
        expect(outputs.length).toEqual(1);
        expect(outputs[0]).toMatchObject({ path: '"out.csv"' });
      });
    });

    describe('scan', () => {
      it('should return metadata for a valid Rust file', () => {
        fs.readFileSync.mockReturnValue(
          'use std::fs;\nlet _ = File::create("out.txt");\nlet _ = fs::read_to_string("in.txt");'
        );

        const testAsset = {
          uri: '/path/to/main.rs',
          type: 'file',
          metadata: [],
        };

        const response = new RustHandler().scan(testAsset);
        expect(response.metadata[0]).toMatchObject({
          id: 'StatWrap.RustHandler',
          libraries: expect.arrayContaining([
            expect.objectContaining({ id: 'std::fs' }),
          ]),
          inputs: expect.arrayContaining([
            expect.objectContaining({ path: '"in.txt"' }),
          ]),
          outputs: expect.arrayContaining([
            expect.objectContaining({ path: '"out.txt"' }),
          ]),
        });
      });
    });
  });
});
