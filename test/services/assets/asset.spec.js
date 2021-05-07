/* eslint-disable no-underscore-dangle */
import fs from 'fs';
import path from 'path';
import AssetService from '../../../app/services/assets/asset';

jest.mock('fs');
jest.mock('os');

class DummyHandler {
  _id = 'Dummy';

  constructor(id) {
    this._id = id;
  }

  id() {
    return this._id;
  }

  scan(asset) {
    asset.metadata.push({ id: this.id() });
    return asset;
  }
}

describe('services', () => {
  describe('assets', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('constructor', () => {
      // TODO - test constructor
    });

    describe('assetType', () => {
      it('should return "unknown" for an invalid stat object', () => {
        expect(new AssetService().assetType(null)).toEqual('unknown');
        expect(new AssetService().assetType(undefined)).toEqual('unknown');
      });

      it('should identify directory objects', () => {
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(true);
        expect(new AssetService().assetType(stat)).toEqual('directory');
      });

      it('should identify file objects', () => {
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(false);
        stat.isFile.mockReturnValueOnce(true);
        expect(new AssetService().assetType(stat)).toEqual('file');
      });

      it('should identify socket objects', () => {
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(false);
        stat.isFile.mockReturnValueOnce(false);
        stat.isSocket.mockReturnValueOnce(true);
        expect(new AssetService().assetType(stat)).toEqual('socket');
      });

      it('should identify symbolic link objects', () => {
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(false);
        stat.isFile.mockReturnValueOnce(false);
        stat.isSocket.mockReturnValueOnce(false);
        stat.isSymbolicLink.mockReturnValueOnce(true);
        expect(new AssetService().assetType(stat)).toEqual('symlink');
      });

      it('should identify other unclassified objects', () => {
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(false);
        stat.isFile.mockReturnValueOnce(false);
        stat.isSocket.mockReturnValueOnce(false);
        expect(new AssetService().assetType(stat)).toEqual('other');
      });
    });

    describe('scan', () => {
      it('should throw an exception for an invalid directory', () => {
        fs.accessSync.mockReturnValue(false);
        const service = new AssetService();
        expect(() => service.scan(null)).toThrow(Error);
        expect(() => service.scan(undefined)).toThrow(Error);
        expect(() => service.scan('~/Test/Invalid/Path')).toThrow(Error);
      });

      it('should handle an empty direcctory', () => {
        // Empty directory at /Some/Valid/Folder
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValueOnce([]);
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(true);
        stat.isFile.mockReturnValueOnce(false);
        fs.statSync.mockReturnValue(stat);
        const testUri = '/Some/Valid/Folder';
        const response = new AssetService().scan(testUri);
        expect(response).toEqual({
          uri: testUri,
          type: 'directory',
          contentType: 'other',
          metadata: [],
          children: []
        });
      });

      it('should traverse a directory hierarchy', () => {
        // Our fake directory structure is under /Some/Valid/Folder
        // Subdir1/
        //         File1
        // File2
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValueOnce(['Subdir1', 'File2']).mockReturnValueOnce(['File1']);
        const stat = new fs.Stats();
        stat.isDirectory
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(false);
        // We don't always call isFile, but when we do it's always true.
        stat.isFile.mockReturnValue(true);
        fs.statSync.mockReturnValue(stat);
        const testUri = '/Some/Valid/Folder';
        const response = new AssetService().scan(testUri);
        expect(response).toEqual({
          uri: testUri,
          type: 'directory',
          contentType: 'other',
          metadata: [],
          children: [
            {
              uri: path.join(testUri, 'Subdir1'),
              type: 'directory',
              contentType: 'other',
              metadata: [],
              children: [
                {
                  uri: path.join(testUri, 'Subdir1', 'File1'),
                  type: 'file',
                  contentType: 'other',
                  metadata: []
                }
              ]
            },
            {
              uri: path.join(testUri, 'File2'),
              type: 'file',
              contentType: 'other',
              metadata: []
            }
          ]
        });
      });

      it('should apply a chain of handlers', () => {
        // Empty directory at /Some/Valid/Folder
        fs.accessSync.mockReturnValue(true);
        fs.readdirSync.mockReturnValueOnce([]);
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(true);
        stat.isFile.mockReturnValueOnce(false);
        fs.statSync.mockReturnValue(stat);
        const testUri = '/Some/Valid/Folder';
        const response = new AssetService([
          new DummyHandler('Dummy1'),
          new DummyHandler('Dummy2')
        ]).scan(testUri);
        expect(response).toEqual({
          uri: testUri,
          type: 'directory',
          children: [],
          contentType: 'other',
          metadata: [{ id: 'Dummy1' }, { id: 'Dummy2' }]
        });
      });
    });

    describe('assetContentType', () => {
      it('should return the default for empty or unspecified parameters', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(false);
        const service = new AssetService();
        expect(service.assetContentType(null, null)).toBe('other');
        expect(service.assetContentType(null, undefined)).toBe('other');
        expect(service.assetContentType(undefined, null)).toBe('other');
        expect(service.assetContentType(null, stat)).toBe('other');
        expect(service.assetContentType('', stat)).toBe('other');
      });

      it('should identify Python files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.py', stat)).toBe('code');
        expect(service.assetContentType('test.py3', stat)).toBe('code');
        expect(service.assetContentType('test.pyi', stat)).toBe('code');
        expect(service.assetContentType('test.PYi', stat)).toBe('code');
        expect(service.assetContentType('test.Py3', stat)).toBe('code');
        // False leads...
        expect(service.assetContentType('test.python', stat)).toBe('other');
        expect(service.assetContentType('test.py4', stat)).toBe('other');
        expect(service.assetContentType('test.py.bak', stat)).toBe('other');
        expect(service.assetContentType('.py', stat)).toBe('other');
        expect(service.assetContentType('.py.bak', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('test.py', stat)).toBe('other');
      });

      it('should identify R code files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.r', stat)).toBe('code');
        expect(service.assetContentType('test.rmd', stat)).toBe('code');
        expect(service.assetContentType('test.rnw', stat)).toBe('code');
        expect(service.assetContentType('test.snw', stat)).toBe('code');
        expect(service.assetContentType('test.R', stat)).toBe('code');
        expect(service.assetContentType('test.RMD', stat)).toBe('code');
        expect(service.assetContentType('test.Rmd', stat)).toBe('code');
        expect(service.assetContentType('test.rNw', stat)).toBe('code');
        expect(service.assetContentType('test.SNW', stat)).toBe('code');
        // False leads...
        expect(service.assetContentType('test.rmdr', stat)).toBe('other');
        expect(service.assetContentType('test.rnws', stat)).toBe('other');
        expect(service.assetContentType('test.rm', stat)).toBe('other');
        expect(service.assetContentType('test.sn', stat)).toBe('other');
        expect(service.assetContentType('test.r.txt', stat)).toBe('other');
        expect(service.assetContentType('test.rnw.txt', stat)).toBe('other');
        expect(service.assetContentType('.r', stat)).toBe('other');
        expect(service.assetContentType('.r.txt', stat)).toBe('other');
        expect(service.assetContentType('.rnw', stat)).toBe('other');
        expect(service.assetContentType('.snw.txt', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('folder.r', stat)).toBe('other');
        expect(service.assetContentType('folder.rnw', stat)).toBe('other');
      });

      it('should identify R data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.rdata', stat)).toBe('data');
        expect(service.assetContentType('test.rda', stat)).toBe('data');
        expect(service.assetContentType('test.RDATA', stat)).toBe('data');
        expect(service.assetContentType('test.RDA', stat)).toBe('data');
        expect(service.assetContentType('test.RdAtA', stat)).toBe('data');
        // False leads...
        expect(service.assetContentType('test.rdat', stat)).toBe('other');
        expect(service.assetContentType('testr.data', stat)).toBe('other');
        expect(service.assetContentType('test.rdata.txt', stat)).toBe('other');
        expect(service.assetContentType('.rdata', stat)).toBe('other');
        expect(service.assetContentType('.rda.txt', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('folder.rda', stat)).toBe('other');
      });

      it('should identify SAS code files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.sas', stat)).toBe('code');
        expect(service.assetContentType('test.SAS', stat)).toBe('code');
        expect(service.assetContentType('test.SaS', stat)).toBe('code');
        // False leads...
        expect(service.assetContentType('test.sassy', stat)).toBe('other');
        expect(service.assetContentType('test.sa', stat)).toBe('other');
        expect(service.assetContentType('test.sas.txt', stat)).toBe('other');
        expect(service.assetContentType('.sas', stat)).toBe('other');
        expect(service.assetContentType('.sas.txt', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('folder.sas', stat)).toBe('other');
      });

      it('should identify Stata code files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.do', stat)).toBe('code');
        expect(service.assetContentType('test.ado', stat)).toBe('code');
        expect(service.assetContentType('test.mata', stat)).toBe('code');
        expect(service.assetContentType('test.DO', stat)).toBe('code');
        expect(service.assetContentType('test.AdO', stat)).toBe('code');
        expect(service.assetContentType('test.mAtA', stat)).toBe('code');
        // False leads...
        expect(service.assetContentType('test.dod', stat)).toBe('other');
        expect(service.assetContentType('test.mat', stat)).toBe('other');
        expect(service.assetContentType('test.do.txt', stat)).toBe('other');
        expect(service.assetContentType('.mata', stat)).toBe('other');
        expect(service.assetContentType('.ado.txt', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('folder.do', stat)).toBe('other');
      });

      it('should identify Stata data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.dta', stat)).toBe('data');
        expect(service.assetContentType('test.DTA', stat)).toBe('data');
        expect(service.assetContentType('test.dTa', stat)).toBe('data');
        // False leads...
        expect(service.assetContentType('test.dta2', stat)).toBe('other');
        expect(service.assetContentType('test.dt', stat)).toBe('other');
        expect(service.assetContentType('test.dta.txt', stat)).toBe('other');
        expect(service.assetContentType('.dta', stat)).toBe('other');
        expect(service.assetContentType('.dta.txt', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('folder.dta', stat)).toBe('other');
      });

      it('should identify SAS data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.sas7bdat', stat)).toBe('data');
        expect(service.assetContentType('test.sd7', stat)).toBe('data');
        expect(service.assetContentType('test.sas7bvew', stat)).toBe('data');
        expect(service.assetContentType('test.sv7', stat)).toBe('data');
        expect(service.assetContentType('test.sas7bndx', stat)).toBe('data');
        expect(service.assetContentType('test.si7', stat)).toBe('data');
        expect(service.assetContentType('test.SAS7BNDX', stat)).toBe('data');
        expect(service.assetContentType('test.SI7', stat)).toBe('data');
        expect(service.assetContentType('test.sAs7bdAt', stat)).toBe('data');
        // False leads...
        expect(service.assetContentType('test.sas6bdat', stat)).toBe('other');
        expect(service.assetContentType('test.sas7bda', stat)).toBe('other');
        expect(service.assetContentType('test.sd7.txt', stat)).toBe('other');
        expect(service.assetContentType('.sd7', stat)).toBe('other');
        expect(service.assetContentType('.sas7bvew', stat)).toBe('other');
        expect(service.assetContentType('.sd7.txt', stat)).toBe('other');
        expect(service.assetContentType('.sas7bdat.txt', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('folder.sas7bdat', stat)).toBe('other');
        expect(service.assetContentType('folder.sd7', stat)).toBe('other');
      });

      it('should identify general data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentType('test.csv', stat)).toBe('data');
        expect(service.assetContentType('test.tsv', stat)).toBe('data');
        expect(service.assetContentType('test.xls', stat)).toBe('data');
        expect(service.assetContentType('test.xlsx', stat)).toBe('data');
        expect(service.assetContentType('test.parquet', stat)).toBe('data');
        expect(service.assetContentType('test.xml', stat)).toBe('data');
        expect(service.assetContentType('test.json', stat)).toBe('data');
        expect(service.assetContentType('test.CSV', stat)).toBe('data');
        expect(service.assetContentType('test.TSV', stat)).toBe('data');
        expect(service.assetContentType('test.XlS', stat)).toBe('data');
        expect(service.assetContentType('test.XlSx', stat)).toBe('data');
        expect(service.assetContentType('test.XLSx', stat)).toBe('data');
        expect(service.assetContentType('test.PARquet', stat)).toBe('data');
        expect(service.assetContentType('test.xML', stat)).toBe('data');
        expect(service.assetContentType('test.JSON', stat)).toBe('data');
        // False leads...
        expect(service.assetContentType('test.csvs', stat)).toBe('other');
        expect(service.assetContentType('test.sv', stat)).toBe('other');
        expect(service.assetContentType('test.xls.txt', stat)).toBe('other');
        expect(service.assetContentType('.xlsx', stat)).toBe('other');
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentType('folder.csv', stat)).toBe('other');
      });
    });
  });
});
