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
      it('should be okay with an empty array of handlers', () => {
        let service = new AssetService(null);
        expect(service.handlers.length).toEqual(0);
        service = new AssetService(null);
        expect(service.handlers.length).toEqual(0);
      });
      it('should take an array of handlers', () => {
        const service = new AssetService([new DummyHandler()]);
        expect(service.handlers.length).toEqual(1);
      });
      it('should create an indexed version of the content type/file extension configuration', () => {
        const contentTypes = [
          {
            name: 'HTML',
            extensions: ['html', 'htm'],
            categories: ['code', 'documentation']
          },
          {
            name: 'Python',
            extensions: ['py'],
            categories: ['code']
          }
        ];
        const service = new AssetService(null, contentTypes);
        // eslint-disable-next-line dot-notation
        expect(service.assetContentTypesByCategory['code'].length).toBe(2);
      });
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
          contentTypes: ['other'],
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
          contentTypes: ['other'],
          metadata: [],
          children: [
            {
              uri: path.join(testUri, 'Subdir1'),
              type: 'directory',
              contentTypes: ['other'],
              metadata: [],
              children: [
                {
                  uri: path.join(testUri, 'Subdir1', 'File1'),
                  type: 'file',
                  contentTypes: ['other'],
                  metadata: []
                }
              ]
            },
            {
              uri: path.join(testUri, 'File2'),
              type: 'file',
              contentTypes: ['other'],
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
          contentTypes: ['other'],
          metadata: [{ id: 'Dummy1' }, { id: 'Dummy2' }]
        });
      });
    });

    describe('assetContentType', () => {
      it('should return the default for empty or unspecified parameters', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(false);
        const service = new AssetService();
        expect(service.assetContentTypes(null, null)).toStrictEqual(['other']);
        expect(service.assetContentTypes(null, undefined)).toStrictEqual(['other']);
        expect(service.assetContentTypes(undefined, null)).toStrictEqual(['other']);
        expect(service.assetContentTypes(null, stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('', stat)).toStrictEqual(['other']);
      });

      it('should identify Python files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.py', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.py3', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.pyi', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.PYi', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.Py3', stat)).toStrictEqual(['code']);
        // False leads...
        expect(service.assetContentTypes('test.python', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.py4', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.py.bak', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.py', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.py.bak', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('test.py', stat)).toStrictEqual(['other']);
      });

      it('should identify R code files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.r', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.rmd', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.rnw', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.snw', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.R', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.RMD', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.Rmd', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.rNw', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.SNW', stat)).toStrictEqual(['code']);
        // False leads...
        expect(service.assetContentTypes('test.rmdr', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.rnws', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.rm', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.sn', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.r.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.rnw.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.r', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.r.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.rnw', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.snw.other', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('folder.r', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('folder.rnw', stat)).toStrictEqual(['other']);
      });

      it('should identify R data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.rdata', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.rda', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.RDATA', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.RDA', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.RdAtA', stat)).toStrictEqual(['data']);
        // False leads...
        expect(service.assetContentTypes('test.rdat', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('testr.data', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.rdata.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.rdata', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.rda.other', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('folder.rda', stat)).toStrictEqual(['other']);
      });

      it('should identify SAS code files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.sas', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.SAS', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.SaS', stat)).toStrictEqual(['code']);
        // False leads...
        expect(service.assetContentTypes('test.sassy', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.sa', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.sas.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.sas', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.sas.other', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('folder.sas', stat)).toStrictEqual(['other']);
      });

      it('should identify Stata code files as code', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.do', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.ado', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.mata', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.DO', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.AdO', stat)).toStrictEqual(['code']);
        expect(service.assetContentTypes('test.mAtA', stat)).toStrictEqual(['code']);
        // False leads...
        expect(service.assetContentTypes('test.dod', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.mat', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.do.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.mata', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.ado.other', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('folder.do', stat)).toStrictEqual(['other']);
      });

      it('should identify Stata data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.dta', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.DTA', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.dTa', stat)).toStrictEqual(['data']);
        // False leads...
        expect(service.assetContentTypes('test.dta2', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.dt', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.dta.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.dta', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.dta.other', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('folder.dta', stat)).toStrictEqual(['other']);
      });

      it('should identify SAS data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.sas7bdat', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.sd7', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.sas7bvew', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.sv7', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.sas7bndx', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.si7', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.SAS7BNDX', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.SI7', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.sAs7bdAt', stat)).toStrictEqual(['data']);
        // False leads...
        expect(service.assetContentTypes('test.sas6bdat', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.sas7bda', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.sd7.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.sd7', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.sas7bvew', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.sd7.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.sas7bdat.other', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('folder.sas7bdat', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('folder.sd7', stat)).toStrictEqual(['other']);
      });

      it('should identify general data files as data', () => {
        const stat = new fs.Stats();
        stat.isFile.mockReturnValue(true);
        const service = new AssetService();
        expect(service.assetContentTypes('test.csv', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.tsv', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.xls', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.xlsx', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.parquet', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.xml', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.json', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.CSV', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.TSV', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.XlS', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.XlSx', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.XLSx', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.PARquet', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.xML', stat)).toStrictEqual(['data']);
        expect(service.assetContentTypes('test.JSON', stat)).toStrictEqual(['data']);
        // False leads...
        expect(service.assetContentTypes('test.csvs', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.sv', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('test.xls.other', stat)).toStrictEqual(['other']);
        expect(service.assetContentTypes('.xlsx', stat)).toStrictEqual(['other']);
        stat.isFile.mockReturnValue(false);
        expect(service.assetContentTypes('folder.csv', stat)).toStrictEqual(['other']);
      });
    });
  });
});
