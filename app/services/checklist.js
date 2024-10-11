import Constants from '../constants/constants';

const fs = require('fs');
const path = require('path');

export default class ChecklistService {
  writeChecklist(projectPath, checklist) {
    if (!projectPath || !checklist) {
      throw new Error('Invalid project path or checklist data');
    }

    const checklistFilePath = path.join(
      projectPath,
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    fs.writeFileSync(checklistFilePath, JSON.stringify(checklist, null, 2), 'utf-8');
  }

  loadChecklists(projectPath, callback) {
    if (!projectPath) {
      callback('The project path must be specified', null);
      return;
    }

    const checklistFilePath = path.join(
      projectPath,
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    if (!fs.existsSync(checklistFilePath)) {
      callback('Checklist file not found', null);
      return;
    }

    try {
      const data = fs.readFileSync(checklistFilePath, 'utf-8');
      const checklists = JSON.parse(data);
      callback(null, checklists);
    } catch (err) {
      callback('Error reading or parsing checklist file', null);
    }
  }
}
