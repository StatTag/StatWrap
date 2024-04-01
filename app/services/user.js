/* eslint-disable no-nested-ternary */
import { v4 as uuid } from 'uuid';
import username from 'username';

const fs = require('fs');

const DefaultSettingsFile = '.user-settings.json';
const SettingsFileFormatVersion = '1';

// Artificially set limit to how many people will be stored in the user's directory.  This
// limit is imposed because the directory will act more like a 'most recently used' list than
// an address book.
const PersonDirectoryLimit = 10;

// Used to verify that we have at least one non-whitespace character in a string
const oneNonWhitespaceRegex = new RegExp('\\S');

export { DefaultSettingsFile, SettingsFileFormatVersion, PersonDirectoryLimit };

export default class UserService {
  /**
   * Return the current system user that StatWrap is running as
   */
  async getUser() {
    return username();
  }

  /**
   * Load the current user's file containing settings.  If no settings file exists, this
   * will return a default settings object.
   * @param {string} filePath The path to the user settings file
   * @returns object containing the user settings data
   */
  loadUserSettingsFromFile(filePath = DefaultSettingsFile) {
    // Empty settings object should represent the expectation for the current
    // format version of settings data.
    let settings = { formatVersion: SettingsFileFormatVersion, directory: [] };
    try {
      fs.accessSync(filePath);
    } catch {
      return settings;
    }

    const data = fs.readFileSync(filePath);
    settings = JSON.parse(data.toString());
    // TODO - at some point in the future, we may need to consider differences across versions
    // of the settings file.
    return settings;
  }

  /**
   * Persist the user settings to disk
   * @param {object} settings The object containing the settings
   * @param {string} filePath The path to the user settings file
   */
  saveUserSettingsToFile(settings, filePath = DefaultSettingsFile) {
    fs.writeFileSync(filePath, JSON.stringify(settings));
  }

  /**
   * Utility function to determine if the name object that is provided is valid or not.
   * @param {object} name Name object consisting of name components
   * @returns bool True if the name is valid, and false otherwise.
   */
  validateName(name) {
    return !(
      !name ||
      !name.first ||
      !name.last ||
      !oneNonWhitespaceRegex.test(name.first) ||
      !oneNonWhitespaceRegex.test(name.last)
    );
  }

  /**
   * Utility function to handle adding or updating a person within the user's directory
   * of people.
   * @param {object} settings The user settings object, assumed to be recently loaded.
   * @param {object} person The person to add to the user's directory
   * @returns object Will be the person record (with the assigned ID, if applicable) if the upsert succeeded.
   * If the upsert did not succeed, it will throw an exception.  If successful, the change will be reflected
   * in the `settings` object. Even if no actual change is needed, this function will still
   * return the person.
   */
  upsertPersonInUserDirectory(settings, person) {
    if (!settings) {
      throw new Error('The settings object cannot be null or undefined');
    } else if (!person) {
      throw new Error('The person object cannot be null or undefined');
    } else if (!this.validateName(person.name)) {
      console.log('invalid name');
      throw new Error(
        'The first name and last name are required, and must be at least one non-whitespace character in length.',
      );
    }

    if (!settings.formatVersion) {
      settings.formatVersion = SettingsFileFormatVersion;
    }
    if (!settings.directory) {
      settings.directory = [];
    }

    // Only copy over the attributes that are related to the directory
    // entry for a person.
    const personCopy = {
      id: person.id,
      name: person.name,
      affiliation: person.affiliation,
      added: new Date(Date.now()).toISOString(),
    };

    // If we have an ID for the person, we need to see if they already exist.  That is
    // our indicator of each person - we won't do any name checks.  If there is no person
    // ID, we need to generate one and then can just add it.
    let addPersonToDirectory = false;
    if (personCopy.id) {
      const existingPerson = settings.directory.find((p) => p.id === personCopy.id);
      if (existingPerson) {
        // Copy over only what attributes need to be saved in the directory.  Some
        // attributs may be specific to the project entry for the person.
        existingPerson.name = personCopy.name;
        existingPerson.affiliation = personCopy.affiliation;
        existingPerson.added = personCopy.added;
        // Yup, we're modifying the original.  It needs to know about the updated added timestamp.
        person.added = personCopy.added;
      } else {
        addPersonToDirectory = true;
      }
    } else {
      personCopy.id = uuid();
      // Yup, we're modifying the original.  It needs to know about the ID.
      person.id = personCopy.id;
      addPersonToDirectory = true;
    }

    if (addPersonToDirectory) {
      // If we have the limit of entries, remove the oldest one
      if (settings.directory.length >= PersonDirectoryLimit) {
        const sortedDirectory = settings.directory.sort((a, b) =>
          a.added > b.added ? -1 : b.added > a.added ? 1 : 0,
        );
        settings.directory = sortedDirectory.slice(0, PersonDirectoryLimit - 1);
      }
      settings.directory.push(personCopy);
    }

    return person;
  }

  /**
   * Utility function to remove a person from the user settings directory.  This will gracefully
   * handle if the person exists in the directory or not.
   * @param {object} settings The user settings
   * @param {object} person The person to remove
   * @returns bool response if the person was found and removed.
   */
  removePersonFromUserDirectory(settings, person) {
    if (!settings || !settings.directory || !person || !person.id) {
      return false;
    }

    if (!settings.formatVersion) {
      settings.formatVersion = SettingsFileFormatVersion;
    }

    const foundIndex = settings.directory.findIndex((p) => p.id === person.id);
    if (foundIndex === -1) {
      return false;
    }

    settings.directory.splice(foundIndex, 1);
    return true;
  }
}
