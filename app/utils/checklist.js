import Constants from '../constants/constants';

export default class ChecklistUtil {
  static initializeChecklist() {
    const checklist = [];
    Constants.CHECKLIST_STATEMENTS.forEach((statement, index) => {
      checklist.push({
        id: index + 1,
        statement: statement,
        answer: false,
        scanResult: {},
        userNotes: [],
        attachedImages: [],
        attachedURLs: [],
        subChecklist: [],
      });
    });
    return checklist;
  }
}
