/* eslint-disable class-methods-use-this */
import projectTemplates from '../constants/project-templates.json';

export default class ProjectTemplateService {
  loadProjectTemplates() {
    // TODO: Can merge in user-defined project templates later.  Right now just our pre-defined ones
    return projectTemplates;
  }
}
