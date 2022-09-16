/* eslint-disable class-methods-use-this */
import Constants from '../constants/constants';

const fs = require('fs');

const DefaultProjectListFile = '.statwrap-projects.json';

export { DefaultProjectListFile };

/**
 * ProjectListService
 *
 * Responsible for managing the user's list of configured projects.  Because
 * user configurations are considered machine-specific, all references
 * to file/directory URIs can be assumed to be absolute paths.
 */
export default class ProjectListService {
  // Toggle the status of a project on our list as a 'Favorite' project
  // return: true if the project was updated, false otherwise
  toggleProjectFavorite(projectId, filePath = DefaultProjectListFile) {
    let projectList = [];
    try {
      fs.accessSync(filePath);
    } catch {
      return false;
    }

    const data = fs.readFileSync(filePath);
    projectList = JSON.parse(data.toString());
    const project = projectList.find(x => x.id === projectId);
    if (!project) {
      return false;
    }

    project.favorite = !project.favorite;
    this.writeProjectList(filePath, projectList);
    return true;
  }

  removeProjectEntry(projectId, filePath = DefaultProjectListFile) {
    let projectList = [];
    try {
      fs.accessSync(filePath);
    } catch {
      return false;
    }

    const data = fs.readFileSync(filePath);
    projectList = JSON.parse(data.toString());
    const index = projectList.findIndex(x => x.id === projectId);
    if (index === -1) {
      return false;
    }

    projectList.splice(index, 1);
    this.writeProjectList(filePath, projectList);
    return true;
  }

  // Add a project to the user's list of projects.
  appendAndSaveProjectToList(project, filePath = DefaultProjectListFile) {
    // If the project is invalid, we won't append it to the list
    this.validateProjectListEntry(project);

    let projectList = [];
    try {
      fs.accessSync(filePath);
    } catch {
      // Do nothing if there's an error, it just means file path doesn't exist yet.
      // We will initialize the file
      this.writeProjectList(filePath, []);
    }

    const data = fs.readFileSync(filePath);
    projectList = JSON.parse(data.toString());

    // If we have a match based on ID or path, don't add it again.
    if (!projectList.some(x => x.id === project.id || x.path === project.path)) {
      projectList.push(project);
      this.writeProjectList(filePath, projectList);
    }
  }

  // Set the date and time that a project (given its ID) was last accessed.
  setProjectLastAccessed(projectId, filePath = DefaultProjectListFile) {
    let projectList = [];
    try {
      fs.accessSync(filePath);
    } catch {
      return false;
    }

    const data = fs.readFileSync(filePath);
    projectList = JSON.parse(data.toString());

    const project = projectList.find(x => x.id === projectId);
    if (!project) {
      return false;
    }

    project.lastAccessed = new Date(Date.now()).toJSON();

    this.writeProjectList(filePath, projectList);
    return true;
  }

  // Get the date and time that a project (given its ID) was last accessed.
  getProjectLastAccessed(projectId, filePath = DefaultProjectListFile) {
    let projectList = [];
    try {
      fs.accessSync(filePath);
    } catch {
      return null;
    }

    const data = fs.readFileSync(filePath);
    projectList = JSON.parse(data.toString());

    const project = projectList.find(x => x.id === projectId);
    if (!project) {
      return null;
    }

    return project.lastAccessed;
  }

  validateProjectListEntry(project) {
    if (!project) {
      throw new Error('The project is empty or undefined');
    }

    if (!project.id || project.id.trim() === '') {
      throw new Error('The project ID is required, but is currently empty');
    }

    if (!project.path || project.path.trim() === '') {
      throw new Error('The project path is required, but is currently empty');
    }
  }

  /**
   * Utility method to take a project list and write it to a file on disk.  This will
   * perform any manipulation/cleaning of the project list data to ensure we are only
   * saving the minimum information needed.
   *
   * @param {string} filePath The absolute path to the project file
   * @param {array} projectList The array of projects to write to the project list file
   */
  writeProjectList(filePath, projectList) {
    // This is a performance hit, but gives us assurance we've got copies of all elements
    // in the array, and nested objects within those elements.
    const projectListCopy = JSON.parse(JSON.stringify(projectList));
    // Remove assets.  Everything else can stay.
    projectListCopy.forEach(x => {
      if (x.assets) {
        delete x.assets;
      }
    });
    fs.writeFileSync(filePath, JSON.stringify(projectListCopy));
  }

  loadProjectListFromFile(filePath = DefaultProjectListFile) {
    try {
      fs.accessSync(filePath);
    } catch {
      return [];
    }

    const data = fs.readFileSync(filePath);
    const projects = JSON.parse(data.toString());
    if (!projects) {
      return [];
    }

    // We are doing a little normalizing for our string comparison.  If one
    // is null and the other is a blank string, it's okay if they match.
    return projects.sort((a, b) => {
      // eslint-disable-next-line prettier/prettier
      const stringA = (a && a.name) ? a.name.toLowerCase() : Constants.UndefinedDefaults.PROJECT;
      // eslint-disable-next-line prettier/prettier
      const stringB = (b && b.name) ? b.name.toLowerCase() : Constants.UndefinedDefaults.PROJECT;
      return stringA.localeCompare(stringB);
    });
  }

  loadProjectListFromFileStub() {
    return [
      {
        id: 'd01d2925-f6ff-4f8e-988f-fca2ee193427',
        name: 'Local project using relative path',
        favorite: true,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        path: '~/Development/StatTag/StatWrapProjects/project1'
      },
      {
        id: '6ff79e02-4f24-4948-ac77-f3f1b67064e5',
        name: 'XuS_775 - Shared drive',
        favorite: false,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        // eslint-disable-next-line prettier/prettier
        path: 'smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/NUCATS/NUCATS_Shared/BERDShared/StatWrap/Test folders/XuS_775'
      },
      {
        id: '6ff79e02-4f24-4948-ac77-f3f1b67064e6',
        name: 'Invalid project',
        favorite: false,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        path: 'smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Project3'
      }
    ];
  }
}
