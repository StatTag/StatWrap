const fs = require('fs');
const os = require('os');
const path = require('path');
const process = require('process');

import ChecklistService from '../../app/services/checklist';
import Constants from '../../app/constants/constants';

jest.mock('fs');
jest.mock('os');

const TEST_USER_HOME_PATH = process.platform === 'win32' ? 'C:\\Users\\test' : '/User/test';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);
const TEST_PROJECT_PATH = process.platform === 'win32' ? `${TEST_USER_HOME_PATH}\\testProject` : '~/testProject';

describe('services', () => {
  describe('ChecklistService', () => {
    const mockProjectPath = TEST_PROJECT_PATH;
    const resolvedProjectPath = path.join(TEST_USER_HOME_PATH, 'testProject', Constants.StatWrapFiles.BASE_FOLDER, Constants.StatWrapFiles.CHECKLIST);
    const checklistData = [{ id: 1, name: 'Dependency', statement: 'All the software dependencies for the project are documented.', answer: true }];

    const checklistService = new ChecklistService();

    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('writeChecklist', () => {
      it('should throw an error if projectPath is null or undefined', () => {
        expect(() => checklistService.writeChecklist(null, checklistData)).toThrow('Invalid project path or checklist data');
        expect(() => checklistService.writeChecklist(undefined, checklistData)).toThrow('Invalid project path or checklist data');
      });

      it('should throw an error if checklist data is null or undefined', () => {
        expect(() => checklistService.writeChecklist(mockProjectPath, null)).toThrow('Invalid project path or checklist data');
        expect(() => checklistService.writeChecklist(mockProjectPath, undefined)).toThrow('Invalid project path or checklist data');
      });

      it('should correctly resolve the project path and write checklist data to a file', () => {
        fs.writeFileSync = jest.fn();

        checklistService.writeChecklist(mockProjectPath, checklistData);

        expect(fs.writeFileSync).toHaveBeenCalledWith(
          resolvedProjectPath,
          JSON.stringify(checklistData)
        );
      });

      it('should handle errors thrown during file write', () => {
        fs.writeFileSync = jest.fn(() => {
          throw new Error('Write failed');
        });

        expect(() => checklistService.writeChecklist(mockProjectPath, checklistData)).toThrow('Write failed');
      });
    });

    describe('loadChecklist', () => {
      it('should return an error if projectPath is null or undefined', (done) => {
        checklistService.loadChecklist(null, (err, result) => {
          expect(err).toBe('The project path must be specified');
          expect(result).toBeNull();
        });
        checklistService.loadChecklist(undefined, (err, result) => {
          expect(err).toBe('The project path must be specified');
          expect(result).toBeNull();
        });
        done();
      });

      it('should return an error if checklist file does not exist', (done) => {
        fs.existsSync = jest.fn().mockReturnValue(false);

        checklistService.loadChecklist(mockProjectPath, (err, result) => {
          expect(err).toBe('Checklist file not found');
          expect(result).toEqual([]);
          done();
        });
      });

      it('should correctly read and parse checklist data from the file', (done) => {
        fs.existsSync = jest.fn().mockReturnValue(true);
        fs.readFileSync = jest.fn().mockReturnValue(JSON.stringify(checklistData));

        checklistService.loadChecklist(mockProjectPath, (err, result) => {
          expect(err).toBeNull();
          expect(result).toEqual(checklistData);
          expect(fs.readFileSync).toHaveBeenCalledWith(resolvedProjectPath);
          done();
        });
      });

      it('should return an error if file read or parsing fails', (done) => {
        fs.existsSync = jest.fn().mockReturnValue(true);
        fs.readFileSync = jest.fn(() => {
          throw new Error('Read failed');
        });

        checklistService.loadChecklist(mockProjectPath, (err, result) => {
          expect(err).toBe('Error reading or parsing checklist file');
          expect(result).toBeNull();
          done();
        });
      });
    });
  });
});
