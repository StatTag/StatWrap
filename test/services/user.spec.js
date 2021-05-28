import fs from 'fs';
import os from 'os';
import username from 'username';
import UserService from '../../app/services/user';

jest.mock('fs');
jest.mock('os');
jest.mock('username');

const TEST_USER_HOME_PATH = process.platform === 'win32' ? 'C:\\Users\\test\\' : '/User/test/';
os.homedir.mockReturnValue(TEST_USER_HOME_PATH);

const settingsString = `{
  "formatVersion": "1",
  "directory": [
    {
      "name" : "Test User"
    },
    {
      "name" : "Other User"
    }
  ]
}`;

const settingsObject = { formatVersion: '1', directory: [] };

const invalidSettingsString = `{
  "formatVersion": "1",
  "id": "d01d2925-f6ff-4f8e-988f-fca2ee193427",
  "name": "Test 1",
  "tags": [ "tag1", "tag2", "tag3"`;

describe('services', () => {
  describe('user', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('getUser', () => {
      it('should return the current user', async () => {
        username.mockReturnValue('test');
        await expect(new UserService().getUser()).resolves.toEqual('test');
      });
    });

    describe('loadUserSettingsFromFile', () => {
      it('should return the user settings from a specified file', () => {
        fs.readFileSync.mockReturnValue(settingsString);
        const settings = new UserService().loadUserSettingsFromFile('test-user-settings.json');
        expect(settings.formatVersion).toBe('1');
        expect(settings.directory.length).toBe(2);
        expect(fs.readFileSync).toHaveBeenCalledWith('test-user-settings.json');
      });
      it('should return the user settings from a default file', () => {
        fs.readFileSync.mockReturnValue(settingsString);
        const settings = new UserService().loadUserSettingsFromFile();
        expect(settings.formatVersion).toBe('1');
        expect(settings.directory.length).toBe(2);
        expect(fs.readFileSync).toHaveBeenCalledWith('.user-settings.json');
      });
      it('should throw an exception if the JSON is invalid', () => {
        fs.readFileSync.mockReturnValue(invalidSettingsString);
        expect(() => new UserService().loadUserSettingsFromFile('/Test/Path')).toThrow(SyntaxError);
      });
      it('should return a default object if the file path does not exist', () => {
        fs.accessSync.mockImplementationOnce(() => {
          throw new Error();
        });
        const settings = new UserService().loadUserSettingsFromFile('/Test/Path');
        expect(settings).not.toBeNull();
        expect(settings.formatVersion).toBe('1');
        expect(settings.directory.length).toBe(0);
        expect(fs.readFileSync).not.toHaveBeenCalled();
      });
    });

    describe('saveUserSettingsToFile', () => {
      it('should save the user settings to a specified file', () => {
        fs.writeFileSync.mockReturnValue(true);
        new UserService().saveUserSettingsToFile(settingsObject, 'test-user-settings.json');
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          'test-user-settings.json',
          JSON.stringify(settingsObject)
        );
      });
      it('should save the user settings to the default file', () => {
        fs.writeFileSync.mockReturnValue(true);
        new UserService().saveUserSettingsToFile(settingsObject);
        expect(fs.writeFileSync).toHaveBeenCalledWith(
          '.user-settings.json',
          JSON.stringify(settingsObject)
        );
      });
    });
  });
});
