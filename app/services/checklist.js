import Constants from '../constants/constants';

const fs = require('fs');
const os = require('os');
const path = require('path');

export default class ChecklistService {
  writeChecklist(projectPath, checklist) {
    if (!projectPath || !checklist) {
      throw new Error('Invalid project path or checklist data');
    }

    const checklistFilePath = path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    fs.writeFileSync(checklistFilePath, JSON.stringify(checklist));
  }

  loadChecklists(projectPath, callback) {
    if (!projectPath) {
      callback('The project path must be specified', null);
      return;
    }

    const checklistFilePath = path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    if (!fs.existsSync(checklistFilePath)) {
      callback('Checklist file not found', null);
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
