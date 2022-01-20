import fs from 'fs';
import os from 'os';
import username from 'username';
// Note: uuid mocking fixed/broke/fixed?  May need to remove this line
// if it breaks again.
import { v4 as uuid } from 'uuid';
import UserService, { PersonDirectoryLimit } from '../../app/services/user';

jest.mock('fs');
jest.mock('os');
jest.mock('username');
jest.mock('uuid');
// Note: uuid mocking fixed/broken/fixed?  May need to re-enable this and
// remove line farther down and above if it breaks again.
// jest.mock('uuid/v4', () => () => '1-2-3');

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
    beforeEach(() => {
      Date.now = jest.fn(() => 1604084623302); // '2020-10-30T19:03:43.302Z'
    });

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
      it('should throw an exception if the settings are null or undefined', () => {
        expect(() => new UserService().upsertPersonInUserDirectory(null, {})).toThrow(Error);
        expect(() => new UserService().upsertPersonInUserDirectory(undefined, {})).toThrow(Error);
      });
      it('should throw an exception if the person is null or undefined', () => {
        expect(() => new UserService().upsertPersonInUserDirectory({}, null)).toThrow(Error);
        expect(() => new UserService().upsertPersonInUserDirectory({}, undefined)).toThrow(Error);
      });
      it('should throw an exception if the person is invalid', () => {
        expect(() =>
          new UserService().upsertPersonInUserDirectory({}, { name: { first: null, last: ' ' } })
        ).toThrow(Error);
      });
      it('should initialize the format version and directory collection in an empty settings object', () => {
        const settings = {};
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: '1-2-3',
            name: { first: 'T', last: 'P' }
          })
        ).not.toBeNull();
        expect(settings.formatVersion).toBe('1');
        expect(settings.directory).not.toBeNull();
      });
      it('should add a new person when the id is provided', () => {
        const settings = {};
        const person = {
          id: '1-2-3',
          name: {
            first: 'Test',
            last: 'Person'
          }
        };
        expect(new UserService().upsertPersonInUserDirectory(settings, person)).not.toBeNull();
        expect(settings.directory[0].id).toEqual('1-2-3');
        expect(settings.directory[0].name).toEqual(person.name);
      });
      it('should add a new person when the id differs in case', () => {
        const settings = {
          directory: [
            {
              id: 'a-b-c',
              name: {
                first: 'Test',
                last: 'Person'
              }
            }
          ]
        };
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: 'A-b-c',
            name: {
              first: 'Other',
              last: 'Person'
            }
          })
        ).not.toBeNull();
        expect(settings.directory[1].id).toEqual('A-b-c');
      });
      it('should add a new person when the id is empty', () => {
        // Note: uuid mocking fixed/broke/fixed?  May need to remove this line
        // if it breaks again.
        uuid.mockImplementationOnce(() => {
          return '1-2-3';
        });
        const settings = {};
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            name: { first: 'Test', last: 'Person' }
          })
        ).not.toBeNull();
        expect(settings.directory[0]).toEqual({
          id: '1-2-3',
          name: { first: 'Test', last: 'Person' },
          added: '2020-10-30T19:03:43.302Z'
        });
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
              added: '2020-10-30T19:03:43.302Z'
            }
          ]
        };

        // Update the result for 'now' to reflect the entry has changed.
        Date.now = jest.fn(() => 1604094623302); // '2020-10-30T21:50:23.302Z'
        const updatedPerson = {
          id: '1-2-3',
          name: {
            first: 'Updated',
            last: 'Person'
          }
        };
        expect(
          new UserService().upsertPersonInUserDirectory(settings, updatedPerson)
        ).not.toBeNull();

        const updatedPersonAnswer = {
          ...updatedPerson,
          added: '2020-10-30T21:50:23.302Z'
        };
        expect(settings.directory[0]).toEqual(updatedPersonAnswer);
      });
      it('should update an existing person and set the added timestamp if it does not exit', () => {
        const settings = {
          directory: [
            {
              id: '1-2-3',
              name: {
                first: 'Test',
                last: 'Person'
              }
            }
          ]
        };

        // Update the result for 'now' to reflect the entry has changed.
        Date.now = jest.fn(() => 1604094623302); // '2020-10-30T21:50:23.302Z'
        const updatedPerson = {
          id: '1-2-3',
          name: {
            first: 'Updated',
            last: 'Person'
          }
        };
        const updatedPersonResponse = new UserService().upsertPersonInUserDirectory(
          settings,
          updatedPerson
        );
        expect(updatedPersonResponse).not.toBeNull();

        const updatedPersonAnswer = {
          ...updatedPerson,
          added: '2020-10-30T21:50:23.302Z'
        };
        expect(settings.directory[0]).toEqual(updatedPersonAnswer);
        expect(updatedPersonResponse).toEqual(updatedPersonAnswer);
      });
      it('should fail to update an existing person if the update person is invalid', () => {
        const settings = {
          directory: [
            {
              id: '1-2-3',
              name: {
                first: 'Test',
                last: 'Person'
              }
            }
          ]
        };
        const updatedPerson = {
          id: '1-2-3',
          name: {
            first: 'Updated'
          }
        };
        expect(() =>
          new UserService().upsertPersonInUserDirectory(settings, updatedPerson)
        ).toThrow(Error);
        expect(settings.directory[0]).not.toEqual(updatedPerson);
      });
      it('should only save the relevant attributes for a person to the directory', () => {
        const settings = {};
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: '1-2-3',
            name: { first: 'Test', last: 'Person' },
            roles: [],
            notes: [],
            other: 'stuff'
          })
        ).not.toBeNull();
        expect(settings.directory[0]).toEqual({
          id: '1-2-3',
          name: { first: 'Test', last: 'Person' },
          added: '2020-10-30T19:03:43.302Z'
        });
      });
      it('should roll off the oldest item when the directory gets too large', () => {
        const settings = { directory: [] };
        for (let index = 0; index < PersonDirectoryLimit; index++) {
          const indexString = index.toString();
          settings.directory.push({
            id: indexString,
            name: { first: 'Test', last: indexString },
            // Date.now is fixed so we are just offsetting that fixed value
            // to have something different.  Our next use of Date.now when
            // we add a new entry will then be the most recent time.
            // eslint-disable-next-line prettier/prettier
            added: new Date(Date.now() - (10 * index)).toISOString()
          });
        }
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: '1-2-3',
            name: { first: 'Test', last: 'Person' }
          })
        ).not.toBeNull();
        expect(settings.directory.length).toEqual(PersonDirectoryLimit);
        expect(settings.directory[PersonDirectoryLimit - 1].id).toEqual('1-2-3');
        expect(settings.directory[PersonDirectoryLimit - 1].name).toEqual({
          first: 'Test',
          last: 'Person'
        });
      });
      it('should roll off multiple old items when the directory far exceeds its limit', () => {
        const settings = { directory: [] };
        // We want to make sure that not only does the oldest item roll off when a new one appears,
        // but if we have a bunch of extra items in the directory they should also roll off.
        // E.g., our directory limit is 10.  We currently have 20 items.  When we try to add a new
        // item, we should end up with 10 items.
        for (let index = 0; index < PersonDirectoryLimit * 2; index++) {
          const indexString = index.toString();
          settings.directory.push({
            id: indexString,
            name: { first: 'Test', last: indexString },
            // Date.now is fixed so we are just offsetting that fixed value
            // to have something different.  Our next use of Date.now when
            // we add a new entry will then be the most recent time.
            // eslint-disable-next-line prettier/prettier
            added: new Date(Date.now() - (10 * index)).toISOString()
          });
        }
        expect(
          new UserService().upsertPersonInUserDirectory(settings, {
            id: '1-2-3',
            name: { first: 'Test', last: 'Person' }
          })
        ).not.toBeNull();
        expect(settings.directory.length).toEqual(PersonDirectoryLimit);
        expect(settings.directory[PersonDirectoryLimit - 1].id).toEqual('1-2-3');
        expect(settings.directory[PersonDirectoryLimit - 1].name).toEqual({
          first: 'Test',
          last: 'Person'
        });
      });
    });

    describe('validateName', () => {
      it('should not consider a null or undefined object valid', () => {
        expect(new UserService().validateName(null)).toBe(false);
        expect(new UserService().validateName(undefined)).toBe(false);
      });
      it('should not consider an empty object valid', () => {
        expect(new UserService().validateName({})).toBe(false);
      });
      it('should not consider valid a name missing the first component', () => {
        expect(new UserService().validateName({ last: 'Person' })).toBe(false);
      });
      it('should not consider valid a name missing the last component', () => {
        expect(new UserService().validateName({ first: 'Test' })).toBe(false);
      });
      it('should not consider valid a name with a null/undefined first component', () => {
        expect(new UserService().validateName({ first: null, last: 'Person' })).toBe(false);
        expect(new UserService().validateName({ first: undefined, last: 'Person' })).toBe(false);
      });
      it('should not consider valid a name with a null/undefined last component', () => {
        expect(new UserService().validateName({ first: 'Test', last: null })).toBe(false);
        expect(new UserService().validateName({ first: 'Test', last: undefined })).toBe(false);
      });
      it('should not consider valid a name with an empty or whitespace only first component', () => {
        expect(new UserService().validateName({ first: '', last: 'Person' })).toBe(false);
        expect(new UserService().validateName({ first: ' ', last: 'Person' })).toBe(false);
        expect(new UserService().validateName({ first: '\t', last: 'Person' })).toBe(false);
        expect(new UserService().validateName({ first: '\n', last: 'Person' })).toBe(false);
        expect(new UserService().validateName({ first: '\r', last: 'Person' })).toBe(false);
      });
      it('should not consider valid a name with an empty or whitespace only last component', () => {
        expect(new UserService().validateName({ first: 'Test', last: '' })).toBe(false);
        expect(new UserService().validateName({ first: 'Test', last: ' ' })).toBe(false);
        expect(new UserService().validateName({ first: 'Test', last: '\t' })).toBe(false);
        expect(new UserService().validateName({ first: 'Test', last: '\n' })).toBe(false);
        expect(new UserService().validateName({ first: 'Test', last: '\r' })).toBe(false);
      });
      it('should consider valid names with at least one letter in each component', () => {
        expect(new UserService().validateName({ first: 'T', last: 'P' })).toBe(true);
        expect(new UserService().validateName({ first: 'Test', last: 'Person' })).toBe(true);
      });
      it('should consider valid names with at least one letter in each component along with whitespace', () => {
        expect(new UserService().validateName({ first: 'T ', last: ' P' })).toBe(true);
        expect(new UserService().validateName({ first: ' T ', last: ' P ' })).toBe(true);
        expect(new UserService().validateName({ first: '\tT', last: 'P\t' })).toBe(true);
        expect(new UserService().validateName({ first: 'T\r', last: '\rP' })).toBe(true);
        expect(new UserService().validateName({ first: 'T\n', last: '\nP' })).toBe(true);
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
