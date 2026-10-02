import Constants from '../constants/constants';

const fs = require('fs');
const os = require('os');
const path = require('path');

export default class CustomAttributesService {
  /**
   * Get the file path for the custom attributes file.
   * @param {string} projectPath The path to the project
   * @returns {string} The full path to the custom attributes file
   */
  getFilePath(projectPath) {
    return path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CUSTOM_ATTRIBUTES,
    );
  }

  /**
   * Writes custom attributes data to the project file.
   * @param {string} projectPath The path to the project
   * @param {Array} attributes The array of custom attribute objects to write
   * @throws {Error} If the project path or attributes data is invalid
   */
  writeCustomAttributes(projectPath, attributes) {
    if (!projectPath || !attributes) {
      throw new Error('Invalid project path or custom attributes data');
    }

    const filePath = this.getFilePath(projectPath);

    // Ensure the .statwrap directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, JSON.stringify(attributes, null, 2));
  }

  /**
   * Loads custom attributes data from the project file.
   * @param {string} projectPath The path to the project
   * @param {function} callback The callback function
   */
  loadCustomAttributes(projectPath, callback) {
    if (!projectPath) {
      callback('The project path must be specified', null);
      return;
    }

    const filePath = this.getFilePath(projectPath);

    if (!fs.existsSync(filePath)) {
      // File doesn't exist yet - return empty array
      callback(null, []);
      return;
    }

    try {
      const data = fs.readFileSync(filePath);
      const attributes = JSON.parse(data);
      callback(null, attributes);
    } catch (err) {
      callback('Error reading or parsing custom attributes file', null);
    }
  }
}