import fs from 'fs';
import FileHandler from '../../../../app/services/assets/handlers/fileHandler';

jest.mock('fs');
jest.mock('os');

describe('services', () => {
  describe('FileHandler', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('id', () => {
      it('should return an id that matches the class name plus StatWrap pseudo-namespace', () => {
        expect(new FileHandler().id()).toEqual(`StatWrap.${FileHandler.name}`);
      });
    });

    describe('scan', () => {
      it('should return a response with just the handler name if the file is not accessible', () => {
        fs.accessSync.mockReturnValue(false);
        const testAsset = {
          uri: '/Some/Invalid/Path',
          type: 'file',
          metadata: []
        };
        const response = new FileHandler().scan(testAsset);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.FileHandler',
          error: 'Unable to access asset'
        });
      });

      it('should return a response with an error message for a valid file but no stats', () => {
        fs.accessSync.mockReturnValue(true);
        fs.statSync.mockReturnValue(null);
        const testAsset = {
          uri: '/Some/Valid/Path',
          type: 'file',
          metadata: []
        };
        const response = new FileHandler().scan(testAsset);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.FileHandler',
          error: 'No information could be found for this asset'
        });
      });

      it("should skip over assets that aren't a file or directory", () => {
        const testAsset = {
          uri: '/Some/Other/Asset',
          type: 'other',
          metadata: []
        };
        const response = new FileHandler().scan(testAsset);
        expect(response.metadata.length).toEqual(0);
      });

      it('should return a response with details for a valid asset', () => {
        fs.accessSync.mockReturnValue(true);
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(false);
        stat.isFile.mockReturnValueOnce(true);
        stat.size = 123456789;
        const baseDate = new Date();
        baseDate.setMonth(1);
        stat.atime = new Date(baseDate.valueOf());
        baseDate.setMonth(2);
        stat.mtime = new Date(baseDate.valueOf());
        baseDate.setMonth(3);
        stat.ctime = new Date(baseDate.valueOf());
        baseDate.setMonth(4);
        stat.birthtime = new Date(baseDate.valueOf());
        fs.statSync.mockReturnValue(stat);

        const testAsset = {
          uri: '/Some/Valid/File',
          type: 'file',
          metadata: []
        };
        const response = new FileHandler().scan(testAsset);
        expect(response.metadata[0]).toEqual({
          id: 'StatWrap.FileHandler',
          size: 123456789,
          lastAccessed: stat.atime,
          lastModified: stat.mtime,
          lastStatusChange: stat.ctime,
          created: stat.birthtime
        });
      });

      it('should handle all nested assets', () => {
        fs.accessSync.mockReturnValue(true);
        const stat = new fs.Stats();
        stat.isDirectory.mockReturnValueOnce(false);
        stat.isFile.mockReturnValueOnce(true);
        stat.size = 123456789;
        const baseDate = new Date();
        baseDate.setMonth(1);
        stat.atime = new Date(baseDate.valueOf());
        baseDate.setMonth(2);
        stat.mtime = new Date(baseDate.valueOf());
        baseDate.setMonth(3);
        stat.ctime = new Date(baseDate.valueOf());
        baseDate.setMonth(4);
        stat.birthtime = new Date(baseDate.valueOf());
        fs.statSync.mockReturnValue(stat);

        const testAsset = {
          uri: '/Some/Valid/Folder',
          type: 'directory',
          metadata: [],
          children: [
            {
              uri: '/Some/Valid/Folder/File1',
              type: 'file',
              metadata: []
            },
            {
              uri: '/Some/Valid/Folder/SubFolder',
              type: 'directory',
              metadata: [],
              children: [
                {
                  uri: '/Some/Valid/Folder/SubFolder/File2',
                  type: 'file',
                  metadata: []
                }
              ]
            }
          ]
        };
        const response = new FileHandler().scan(testAsset);
        const expectedMetadata = {
          id: 'StatWrap.FileHandler',
          size: 123456789,
          lastAccessed: stat.atime,
          lastModified: stat.mtime,
          lastStatusChange: stat.ctime,
          created: stat.birthtime
        };
        expect(response.metadata[0]).toEqual(expectedMetadata);
        expect(response.children[0].metadata[0]).toEqual(expectedMetadata);
        expect(response.children[1].metadata[0]).toEqual(expectedMetadata);
        expect(response.children[1].children[0].metadata[0]).toEqual(expectedMetadata);
      });
    });
  });
});
