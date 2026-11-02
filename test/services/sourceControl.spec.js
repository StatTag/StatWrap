import fs from 'fs';
import git from 'isomorphic-git';
import SourceControlService from '../../app/services/sourceControl';

jest.mock('fs');
jest.mock('isomorphic-git');

function hasSourceControlEnabledCheck(service, path, expectedReturn) {
  return expect(service.hasSourceControlEnabled(path)).resolves.toBe(expectedReturn);
}

describe('services', () => {
  /*
  beforeEach(() => {
    fs.readFileSync = jest.fn();
  });

  afterEach(() => {
    fs.readFileSync.mockClear();
  });
  */

  describe('sourceControl', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('hasSourceControlEnabled', () => {
      it('should return false for empty file paths', () => {
        const service = new SourceControlService();
        hasSourceControlEnabledCheck(service, null, false);
        hasSourceControlEnabledCheck(service, undefined, false);
        hasSourceControlEnabledCheck(service, '', false);
      });

      it('should return false for invalid file path', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        const service = new SourceControlService();
        hasSourceControlEnabledCheck(service, '/Invalid/Path', false);
      });

      it('should return false for valid file path with no branches', async () => {
        fs.accessSync.mockImplementationOnce(() => {
          /* NOP */
        });
        git.listBranches.mockImplementationOnce(() => {
          return [];
        });
        const service = new SourceControlService();
        hasSourceControlEnabledCheck(service, '/Valid/Path', false);
      });

      it('should return true for valid file path with one branch', async () => {
        fs.accessSync.mockImplementationOnce(() => {
          /* NOP */
        });
        git.listBranches.mockImplementationOnce(() => {
          return ['main'];
        });
        const service = new SourceControlService();
        hasSourceControlEnabledCheck(service, '/Valid/Path', true);
      });
    });

    describe('convertTimestamp', () => {
      it('should return null for undefined committer', () => {
        const service = new SourceControlService();
        expect(service.convertTimestamp(null)).toBeNull();
        expect(service.convertTimestamp(undefined)).toBeNull();
      });

      it('should convert a timestamp if an offset is provided', () => {
        const service = new SourceControlService();
        expect(
          service.convertTimestamp({ timestamp: 1234567890, timezoneOffset: 360 }),
        ).toStrictEqual(new Date((1234567890 - 360 * 60) * 1000));
      });

      it('should keep the timestamp if the offset is 0', () => {
        const service = new SourceControlService();
        expect(
          service.convertTimestamp({ timestamp: 1234567890, timezoneOffset: 0 }),
        ).toStrictEqual(new Date(1234567890000));
      });
    });

    describe('getFileHistory', () => {
      it('should return null for empty project paths', async () => {
        const service = new SourceControlService();
        await expect(service.getFileHistory(null, 'test.txt')).resolves.toBeNull();
        return expect(service.getFileHistory(undefined, 'test.txt')).resolves.toBeNull();
      });

      it('should return null for empty file paths', async () => {
        const service = new SourceControlService();
        await expect(service.getFileHistory('/test/path', null)).resolves.toBeNull();
        return expect(service.getFileHistory('/test/path', undefined)).resolves.toBeNull();
      });

      it('should return an empty array for invalid file path', async () => {
        const service = new SourceControlService();
        return expect(
          service.getFileHistory('/Invalid/Path', 'DoesNotExist.txt'),
        ).resolves.toStrictEqual([]);
      });
    });

    describe('getHistory', () => {
      it('should return null for empty project paths', async () => {
        const service = new SourceControlService();
        await expect(service.getHistory(null)).resolves.toBeNull();
        return expect(service.getHistory(undefined)).resolves.toBeNull();
      });
      it('should return the history', () => {
        git.log.mockImplementationOnce(() => {
          return [
            {
              commit: {
                message: 'Test 2',
                committer: {
                  name: 'Test Person2',
                  email: 'test2@test.com',
                  timestamp: 1234567890,
                  timezoneOffset: 360,
                },
              },
            },
          ];
        });
        const service = new SourceControlService();
        return expect(service.getHistory('/test/path')).resolves.not.toBeNull();
      });
    });

    describe('_getHistory', () => {
      it('should format history objects', async () => {
        git.log.mockImplementationOnce(() => {
          return [
            {
              commit: {
                message: 'Test 2',
                committer: {
                  name: 'Test Person2',
                  email: 'test2@test.com',
                  timestamp: 1234567890,
                  timezoneOffset: 360,
                },
              },
            },
            {
              commit: {
                message: 'Test',
                committer: {
                  name: 'Test Person',
                  email: 'test@test.com',
                  timestamp: 123456789,
                  timezoneOffset: 0,
                },
              },
            },
          ];
        });
        const service = new SourceControlService();
        return expect(service._getHistory('/Root/Path', 'File.txt')).resolves.toStrictEqual([
          {
            message: 'Test 2',
            committer: 'Test Person2 (test2@test.com)',
            timestamp: new Date((1234567890 - 360 * 60) * 1000),
          },
          {
            message: 'Test',
            committer: 'Test Person (test@test.com)',
            timestamp: new Date(123456789000),
          },
        ]);
      });
    });

    describe('getVersionControlDetails', () => {
      it('should return empty array for null, undefined or empty project paths', async () => {
        const service = new SourceControlService();
        expect(await service.getVersionControlDetails(null)).toEqual([]);
        expect(await service.getVersionControlDetails(undefined)).toEqual([]);
        expect(await service.getVersionControlDetails('')).toEqual([]);
      });

      it('should return empty array when path is inaccessible', async () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error('Inaccessible');
        });
        const service = new SourceControlService();
        expect(await service.getVersionControlDetails('/Invalid/Path')).toEqual([]);
      });

      it('should return empty array when .git does not exist', async () => {
        fs.accessSync.mockImplementationOnce(() => {});
        fs.existsSync.mockReturnValueOnce(false);
        const service = new SourceControlService();
        expect(await service.getVersionControlDetails('/Valid/Path')).toEqual([]);
      });

      it('should detect git directory and resolve active branch via git.currentBranch', async () => {
        fs.accessSync.mockImplementationOnce(() => {});
        fs.existsSync.mockImplementation((p) => p.endsWith('.git'));
        fs.statSync.mockReturnValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        });
        git.currentBranch.mockResolvedValueOnce('main');

        const service = new SourceControlService();
        expect(await service.getVersionControlDetails('/Valid/Path')).toEqual([
          'Git repository detected (.git)',
          'Active branch: main',
        ]);
      });

      it('should fallback to reading HEAD file when git.currentBranch throws', async () => {
        fs.accessSync.mockImplementationOnce(() => {});
        fs.existsSync.mockImplementation((p) => p.endsWith('.git') || p.endsWith('HEAD'));
        fs.statSync.mockReturnValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        });
        git.currentBranch.mockRejectedValueOnce(new Error('Git error'));
        fs.readFileSync.mockReturnValueOnce('ref: refs/heads/feature-branch\n');

        const service = new SourceControlService();
        expect(await service.getVersionControlDetails('/Valid/Path')).toEqual([
          'Git repository detected (.git)',
          'Active branch: feature-branch',
        ]);
      });

      it('should detect git directory without branch when HEAD is detached or missing ref', async () => {
        fs.accessSync.mockImplementationOnce(() => {});
        fs.existsSync.mockImplementation((p) => p.endsWith('.git') || p.endsWith('HEAD'));
        fs.statSync.mockReturnValueOnce({
          isDirectory: () => true,
          isFile: () => false,
        });
        git.currentBranch.mockResolvedValueOnce(undefined);
        fs.readFileSync.mockReturnValueOnce('1a2b3c4d5e6f7a8b9c0d\n');

        const service = new SourceControlService();
        expect(await service.getVersionControlDetails('/Valid/Path')).toEqual([
          'Git repository detected (.git)',
        ]);
      });

      it('should detect submodule or worktree when .git is a file', async () => {
        fs.accessSync.mockImplementationOnce(() => {});
        fs.existsSync.mockImplementation((p) => p.endsWith('.git'));
        fs.statSync.mockReturnValueOnce({
          isDirectory: () => false,
          isFile: () => true,
        });

        const service = new SourceControlService();
        expect(await service.getVersionControlDetails('/Valid/Path')).toEqual([
          'Git repository detected (.git file)',
        ]);
      });

      it('should return empty array if fs.existsSync throws unexpectedly', async () => {
        fs.accessSync.mockImplementationOnce(() => {});
        fs.existsSync.mockImplementationOnce(() => {
          throw new Error('Permission denied');
        });

        const service = new SourceControlService();
        expect(await service.getVersionControlDetails('/Valid/Path')).toEqual([]);
      });
    });
  });
});
