import { v4 as uuid } from 'uuid';
import username from 'username';
// import Constants from '../constants/constants';

const fs = require('fs');
// const os = require('os');
// const path = require('path');

const DefaultSettingsFile = '.user-settings.json';
const SettingsFileFormatVersion = '1';

export { DefaultSettingsFile, SettingsFileFormatVersion };

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
   * Utility function to handle adding or updating a person within the user's directory
   * of people.
   * @param {object} settings The user settings object, assumed to be recently loaded.
   * @param {object} person The person to add to the user's directory
   * @returns bool if the upsert succeeded or not.  If successful, the change will be reflected
   * in the `settings` object. Even if no actual change is needed, this function will still
   * return true.
   */
  upsertPersonInUserDirectory(settings, person) {
    if (!settings || !person) {
      return false;
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
      email: person.email,
      affiliation: person.affiliation
    };

    // If we have an ID for the person, we need to see if they already exist.  That is
    // our indicator of each person - we won't do any name checks.  If there is no person
    // ID, we need to generate one and then can just add it.
    if (personCopy.id) {
      const existingPerson = settings.directory.find(p => p.id === personCopy.id);
      if (existingPerson) {
        // Copy over only what attributes need to be saved in the directory.  Some
        // attributs may be specific to the project entry for the person.
        existingPerson.name = personCopy.name;
        existingPerson.email = personCopy.email;
        existingPerson.affiliation = personCopy.affiliation;
      } else {
        settings.directory.push(personCopy);
      }
    } else {
      personCopy.id = uuid();
      settings.directory.push(personCopy);
    }

    return true;
  }
}
