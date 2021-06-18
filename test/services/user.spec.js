import fs from 'fs';
import os from 'os';
import { v4 as uuid } from 'uuid';
import username from 'username';
import UserService from '../../app/services/user';

jest.mock('fs');
jest.mock('os');
jest.mock('username');
jest.mock('uuid');

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

    describe('upsertPersonInUserDirectory', () => {
      it('should return null if the settings are null or undefined', () => {
        expect(new UserService().upsertPersonInUserDirectory(null, {})).toBeNull();
        expect(new UserService().upsertPersonInUserDirectory(undefined, {})).toBeNull();
      });
      it('should return null if the person is null or undefined', () => {
        expect(new UserService().upsertPersonInUserDirectory({}, null)).toBeNull();
        expect(new UserService().upsertPersonInUserDirectory({}, undefined)).toBeNull();
      });
      it('should initialize the format version and directory collection in an empty settings object', () => {
        const settings = {};
        expect(
          new UserService().upsertPersonInUserDirectory(settings, { id: '1-2-3' })
        ).not.toBeNull();
        expect(settings.formatVersion).toBe('1');
        expect(settings.directory).not.toBeNull();
      });
      it('should add a new person when the id is provided', () => {
        const settings = {};
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: '1-2-3',
            email: 'test@test.com'
          })
        ).not.toBeNull();
        expect(settings.directory[0]).toEqual({ id: '1-2-3', email: 'test@test.com' });
      });
      it('should add a new person when the id differs in case', () => {
        const settings = {
          directory: [
            {
              id: 'a-b-c',
              name: {
                first: 'Test',
                last: 'Person'
              },
              email: 'test@test.com'
            }
          ]
        };
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: 'A-b-c',
            email: 'test@test.com'
          })
        ).not.toBeNull();
        expect(settings.directory[1]).toEqual({ id: 'A-b-c', email: 'test@test.com' });
      });
      it('should add a new person when the id is empty', () => {
        uuid.mockImplementation(() => '1-2-3');
        const settings = {};
        expect(
          new UserService().upsertPersonInUserDirectory(settings, { email: 'test@test.com' })
        ).not.toBeNull();
        expect(settings.directory[0]).toEqual({ id: '1-2-3', email: 'test@test.com' });
      });
      it('should update an existing person', () => {
        const settings = {
          directory: [
            {
              id: '1-2-3',
              name: {
                first: 'Test',
                last: 'Person'
              },
              email: 'test@test.com'
            }
          ]
        };
        const updatedPerson = {
          id: '1-2-3',
          name: {
            first: 'Updated',
            last: 'Person'
          },
          email: 'test2@test.com'
        };
        expect(
          new UserService().upsertPersonInUserDirectory(settings, updatedPerson)
        ).not.toBeNull();
        expect(settings.directory[0]).toEqual(updatedPerson);
      });
      it('should only save the relevant attributes for a person to the directory', () => {
        const settings = {};
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: '1-2-3',
            email: 'test@test.com',
            roles: [],
            notes: []
          })
        ).not.toBeNull();
        expect(settings.directory[0]).toEqual({ id: '1-2-3', email: 'test@test.com' });
      });
    });

    describe('removePersonFromUserDirectory', () => {
      it('should return false if the settings are null or undefined', () => {
        expect(new UserService().removePersonFromUserDirectory(null, {})).toBe(false);
        expect(new UserService().removePersonFromUserDirectory(undefined, {})).toBe(false);
      });
      it('should return false if the person is null or undefined', () => {
        expect(new UserService().removePersonFromUserDirectory({}, null)).toBe(false);
        expect(new UserService().removePersonFromUserDirectory({}, undefined)).toBe(false);
      });
      it('should return false if the person ID is null or undefined', () => {
        expect(new UserService().removePersonFromUserDirectory({ directory: [] }, {})).toBe(false);
        expect(
          new UserService().removePersonFromUserDirectory({ directory: [] }, { id: null })
        ).toBe(false);
        expect(
          new UserService().removePersonFromUserDirectory({ directory: [] }, { id: undefined })
        ).toBe(false);
      });
      it('should set the settings format version if it does not exist', () => {
        const settings = {
          directory: []
        };
        new UserService().removePersonFromUserDirectory(settings, { id: '1-2-3' });
        expect(settings.formatVersion).toBe('1');
      });
      it('should remove a person when matched on ID', () => {
        const settings = {
          directory: [{ id: '1-2-3' }, { id: '2-3-4' }]
        };
        expect(new UserService().removePersonFromUserDirectory(settings, { id: '1-2-3' })).toBe(
          true
        );
        expect(settings.directory.length).toBe(1);
        expect(settings.directory[0]).toEqual({ id: '2-3-4' });
      });
      it('should not remove a person when there is not matching ID', () => {
        const settings = {
          directory: [{ id: '1-2-3' }, { id: '2-3-4' }]
        };
        expect(new UserService().removePersonFromUserDirectory(settings, { id: '3-4-5' })).toBe(
          false
        );
        expect(settings.directory.length).toBe(2);
      });
    });
  });
});
