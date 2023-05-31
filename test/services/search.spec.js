import fs from 'fs';
import path from 'path';
import SearchService from '../../app/services/search';

jest.mock('fs');
jest.mock('path');

describe('services', () => {
  describe('search', () => {
    afterEach(() => {
      jest.resetMocks();
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
        service.addIndexer('1', '~');
        expect(service.indexers.size).toBe(1);
      });

      it('should not add an indexer if the ID is not set', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer(null, '~');
        expect(service.indexers.size).toBe(0);

        service.addIndexer(undefined, '~');
        expect(service.indexers.size).toBe(0);
      });

      it('should not add an indexer if the root path is not set', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer(1, null);
        expect(service.indexers.size).toBe(0);

        service.addIndexer(1, undefined);
        expect(service.indexers.size).toBe(0);
      });

      it('should only add an indexer once for a given ID', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        const indexer = service.addIndexer('1', '~');
        expect(service.addIndexer('1', '/')).toEqual(indexer);
        expect(service.addIndexer('1', '/home')).toEqual(indexer);
        expect(service.indexers.size).toBe(1);
      });

      it('should throw an error if the root path is relative', () => {
        path.isAbsolute.mockReturnValue(false);
        const service = new SearchService();
        expect(() => service.addIndexer('1', '~/path')).toThrow(Error);
      });
    });

    describe('startIndexer', () => {
      it('should start an new indexer for a project', () => {
        fs.accessSync.mockImplementationOnce(() => {
          /* NOP */
        });
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', '~');
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
        service.addIndexer('1', '~');
        expect(service.startIndexer('2')).toBeNull();
        expect(service.startIndexer('1 ')).toBeNull();
      });

      it('should return null if the root path is invalid', () => {
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', null);
        expect(service.startIndexer('1')).toBeNull();
        service.addIndexer('2', undefined);
        expect(service.startIndexer('2')).toBeNull();
      });

      it('should return null if the root path cannot be found', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        path.isAbsolute.mockReturnValue(true);
        const service = new SearchService();
        service.addIndexer('1', '/some/invalid/path');
        expect(() => service.startIndexer('1')).toThrow(Error);
      });

      it('should recursively add files to index', () => {
        fs.accessSync.mockImplementationOnce(() => {
          /* NOP */
        });
        // Mock directory structure:
        // /root/
        //    -- Subdir1/
        //             -- File1
        //    -- File2
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
        const indexer = service.addIndexer('1', '/root');
        const addMock = jest.spyOn(indexer, 'add');
        service.startIndexer('1');
        // Because we only have 2 files, we should only add 2 files to the index.
        expect(addMock).toHaveBeenCalledTimes(2);
      });
    });
  });
});
