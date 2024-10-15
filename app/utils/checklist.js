import Constants from '../constants/constants';

export default class ChecklistUtil {
  static initializeChecklist() {
    const checklist = [];
    Constants.CHECKLIST_STATEMENTS.forEach((statement, index) => {
      checklist.push({
        id: index + 1,
        name: statement[0],
        statement: statement[1],
        answer: false,
        scanResult: {},
        notes: [],
        images: [],
        urls: [],
        subChecklist: [],
      });
    });
    return checklist;
  }
}
