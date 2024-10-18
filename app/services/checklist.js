import Constants from '../constants/constants';

const fs = require('fs');
const os = require('os');
const path = require('path');

export default class ChecklistService {
  /**
   * Writes the checklist data to the checklist file
   * @param {string} projectPath The path to the project
   * @param {object} checklist The checklist data to write
   * @throws {Error} If the project path or checklist data is invalid or if there is an error writing the file
   */
  writeChecklist(projectPath, checklist) {
    if (!projectPath || !checklist) {
      throw new Error('Invalid project path or checklist data');
    }

    // Unix-based paths may start with ~, which needs to be replaced with the home directory
    const checklistFilePath = path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    fs.writeFileSync(checklistFilePath, JSON.stringify(checklist));
  }

  /**
   * Loads the checklist data from the checklist file
   * @param {string} projectPath The path to the project
   * @param {function} callback The callback function to call with the loaded checklist data and error message
   */
  loadChecklist(projectPath, callback) {
    if (!projectPath) {
      callback('The project path must be specified', null);
      return;
    }

    // Unix-based paths may start with ~, which needs to be replaced with the home directory
    const checklistFilePath = path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    if (!fs.existsSync(checklistFilePath)) {
      // If the checklist file does not exist, return an empty array
      // so that it doesn't display error in the UI for existing projects
      callback('Checklist file not found', []);
      return;
    }

    try {
      const data = fs.readFileSync(checklistFilePath);
      const checklists = JSON.parse(data);
      callback(null, checklists);
    } catch (err) {
      callback('Error reading or parsing checklist file', null);
    }
  }
}
