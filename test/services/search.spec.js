import fs from 'fs';
import path from 'path';
import SearchService from '../../app/services/search';

jest.mock('fs');
jest.mock('path');

describe('services', () => {
  describe('search', () => {
    afterEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();
    });

    describe('constructor', () => {
      it('should not have any indexers', () => {
        const service = new SearchService();
        expect(service.indexers.size).toBe(0);
      });
    });

    describe('addIndexer', () => {
      it('should add a new indexer for a project', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', { rootPath: '~' });
        expect(service.indexers.size).toBe(1);
      });

      it('should not add an indexer if the ID is not set', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        expect(() => service.addIndexer(null, { rootPath: '~' })).toThrow(
          'The ID and config must both be provided'
        );
        expect(() => service.addIndexer(undefined, { rootPath: '~' })).toThrow(
          'The ID and config must both be provided'
        );
      });

      it('should not add an indexer if the config is not set', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        expect(() => service.addIndexer('1', null)).toThrow(
          'The ID and config must both be provided'
        );
        expect(() => service.addIndexer('1', undefined)).toThrow(
          'The ID and config must both be provided'
        );
      });

      it('should only add an indexer once for a given ID', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        const indexer = service.addIndexer('1', { rootPath: '~' });
        expect(service.addIndexer('1', { rootPath: '/' })).toEqual(indexer);
        expect(service.addIndexer('1', { rootPath: '/home' })).toEqual(indexer);
        expect(service.indexers.size).toBe(1);
      });

      it('should throw an error if the root path is relative', () => {
        path.isAbsolute.mockReturnValue(false);
        const service = new SearchService();
        expect(() => service.addIndexer('1', { rootPath: '~/path' })).toThrow(Error);
      });

      it('should throw an error if both config options are set', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        expect(() => service.addIndexer('1', { rootPath: '~/path', assets: {} })).toThrow(
          'The config cannot have both the rootPath and assets specified'
        );
      });

      it('should throw an error if the config is an empty object', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        expect(() => service.addIndexer('1', {})).toThrow(
          'The config must have defined either the rootPath or the assets to index'
        );
      });
    });

    describe('startIndexer', () => {
      it('should start an new indexer for a project', () => {
        fs.accessSync.mockImplementationOnce(() => {
          /* NOP */
        });
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', { rootPath: '~' });
        expect(service.startIndexer('1')).not.toBeNull();
      });

      it('should return null if the ID is not set', () => {
        const service = new SearchService();
        expect(service.startIndexer(null)).toBeNull();
        expect(service.startIndexer(undefined)).toBeNull();
      });

      it('should return null if there is no matching ID', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', { rootPath: '~' });
        expect(service.startIndexer('2')).toBeNull();
        expect(service.startIndexer('1 ')).toBeNull();
      });

      it('should return null if the config is invalid', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', { rootPath: '~' });

        // To test this, we are manipulating the internally managed list of indexers.
        // We don't expect this to happen in practice, but is the only way to get into a
        // testable error state.
        service.indexers.get('1').config = null;
        expect(service.startIndexer('1')).toBeNull();
        service.indexers.get('1').config = undefined;
        expect(service.startIndexer('1')).toBeNull();
      });

      it('should return null if the root path cannot be found', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', { rootPath: '/some/invalid/path' });
        expect(() => service.startIndexer('1')).toThrow(Error);
      });

      it('should recursively add assets to the index', () => {
        const testUri = '/valid/path';
        const config = {
          assets: {
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
          }
        };

        fs.accessSync.mockImplementationOnce(() => {
          /* NOP */
        });
        const stat = new fs.Stats();
        stat.isDirectory
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(true)
          .mockReturnValueOnce(false)
          .mockReturnValueOnce(false);
        fs.statSync.mockReturnValue(stat);
        fs.readFileSync.mockReturnValue('test');
        fs.readdirSync.mockReturnValueOnce(['Subdir1', 'File2']).mockReturnValueOnce(['File1']);
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        const indexer = service.addIndexer('1', config);
        const addMock = jest.spyOn(indexer, 'add');
        service.startIndexer('1');
        // Because we only have 2 files, we should only add 2 files to the index.
        expect(addMock).toHaveBeenCalledTimes(2);
      });
    });

    it('should filter out certain classes of assets', () => {
      const testUri = '/valid/path';
      const config = {
        assets: {
          uri: testUri,
          type: 'directory',
          contentTypes: ['other'],
          metadata: [],
          children: [
            {
              uri: path.join(testUri, 'Subdir1'),
              type: 'directory',
              contentTypes: ['data'],
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
              contentTypes: ['other', 'data'],
              metadata: []
            },
            {
              uri: path.join(testUri, 'File3'),
              type: 'file',
              contentTypes: ['documentation'],
              metadata: []
            }
          ]
        }
      };

      fs.accessSync.mockImplementationOnce(() => {
        /* NOP */
      });
      const stat = new fs.Stats();
      stat.isDirectory
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(false);
      fs.statSync.mockReturnValue(stat);
      fs.readFileSync.mockReturnValue('test');
      fs.readdirSync.mockReturnValueOnce(['Subdir1', 'File2']).mockReturnValueOnce(['File1']);
      path.isAbsolute.mockReturnValue(true);
      const service = new SearchService();
      const indexer = service.addIndexer('1', config);
      const addMock = jest.spyOn(indexer, 'add');
      service.startIndexer('1');
      // Because we only have 1 valid file (File3), we should only add 1 file to the index.
      expect(addMock).toHaveBeenCalledTimes(1);
    });
  });
});
