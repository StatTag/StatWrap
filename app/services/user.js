// import { v4 as uuid } from 'uuid';
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
}
