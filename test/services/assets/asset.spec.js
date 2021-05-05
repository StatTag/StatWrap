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
        stat.isFile.mockReturnValueOnce(true).mockReturnValueOnce(true);
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
  });
});
