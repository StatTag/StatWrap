/* eslint-disable class-methods-use-this */
import { v4 as uuid } from 'uuid';
import projectTemplates from '../constants/project-templates.json';
import Constants from '../constants/constants';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DefaultProjectListFile = '.statwrap-projects.json';
const DefaultProjectFile = '.statwrap-project.json';
const MaximumFolderNameLength = 255;

export { DefaultProjectListFile, DefaultProjectFile };

export default class ProjectService {
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

  loadStub() {
    return {
      id: '6ff79e02-4f24-4948-ac77-f3f1b67064e6',
      name: 'Test 3',
      tags: ['NIH', 'Grant', 'Team Science']
    };
  }

  loadProjectListFromFile(filePath = DefaultProjectListFile) {
    if (!fs.existsSync(filePath)) {
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
      const stringA = (a && a.name) ? a.name.toLowerCase() : Constants.UndefinedDefaults.PROJECT;
      const stringB = (b && b.name) ? b.name.toLowerCase() : Constants.UndefinedDefaults.PROJECT;
      return stringA.localeCompare(stringB);
    });
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

  // Add a project to the user's list of projects.
  appendAndSaveProjectToList(project, filePath = DefaultProjectListFile) {
    // If the project is invalid, we won't append it to the list
    this.validateProjectListEntry(project);

    let projectList = [];
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      projectList = JSON.parse(data.toString());
    }

    // If we have a match based on ID or path, don't add it again.
    if (!projectList.some(x => x.id === project.id || x.path === project.path)) {
      projectList.push(project);
      fs.writeFileSync(filePath, JSON.stringify(projectList));
    }
  }

  // Load the project configuration file from a given project's directory.
  // It enforces internally the name of the file to be used, so the file
  // name should not be specified as part of projectPath.
  loadProjectFile(projectPath) {
    const filePath = path.join(projectPath.replace('~', os.homedir), DefaultProjectFile);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath);
    return JSON.parse(data.toString());
  }

  // Save the project configuration file to a given project's directory.
  // It enforces internally the name of the file to be used, so the file
  // name should not be specified as part of projectPath.
  // Note that this entirely overwrites the project configuration file, so
  // the project parameter should include all of the project attributes.
  saveProjectFile(projectPath, project) {
    // If the path to the project doesn't exist, we can't proceed
    if (!fs.existsSync(projectPath)) {
      throw new Error(`Unable to access the project directory: ${projectPath}`);
    }

    // If the project doesn't at least have an ID, we won't save it.
    if (!project || !project.id) {
      throw new Error('Unable to save the project configuration because it is empty');
    } else if (project.id.trim() === '') {
      throw new Error('Unable to save the project configuration because it is missing an ID');
    }

    const filePath = path.join(projectPath.replace('~', os.homedir), DefaultProjectFile);
    fs.writeFileSync(filePath, JSON.stringify(project));
  }

  loadProjectTemplates() {
    // TODO: Can merge in user-defined project templates later.  Right now just our pre-defined ones
    return projectTemplates;
  }

  // Utility function to sanitize the name of a folder by removing invalid macOS and Windows characters
  // from the input folder name.
  sanitizeFolderName(name) {
    if (!name) {
      return '';
    }

    const sanitizedName = name
      .trim()
      .replace(/^\.|\.$|[/?<>\\:*|"]/g, '')
      .trim();
    return sanitizedName.length > MaximumFolderNameLength
      ? sanitizedName.substr(0, MaximumFolderNameLength)
      : sanitizedName;
  }

  // Given a project definition from user input, convert it into a project definition that will be
  // saved to our project list.
  convertAndValidateProject(project) {
    const validationReport = {
      project: null,
      isValid: false,
      details: 'Not all validation checks were able to be completed'
    };

    if (!project) {
      validationReport.isValid = false;
      validationReport.details = 'No project information was provided for validation';
      return validationReport;
    }

    // Regardless of how the project was established, there are some fields we want
    // to initialize consistently.
    validationReport.project = {
      id: uuid(),
      favorite: false,
      lastAccessed: new Date().toJSON()
    };

    switch (project.type) {
      case Constants.ProjectType.NEW_PROJECT_TYPE: {
        // The user will have specified a new directory name, which needs to be
        // appended to the root folder.
        const sanitizedName = this.sanitizeFolderName(project.name);
        const projectDirectory = path.join(
          project.directory.replace('~', os.homedir),
          sanitizedName
        );
        validationReport.project.name = project.name;
        validationReport.project.path = projectDirectory;
        validationReport.isValid = true;
        validationReport.details = '';
        break;
      }
      case Constants.ProjectType.EXISTING_PROJECT_TYPE: {
        // The user will have specified the project's root as the directory name.
        // We will get the name from the last part of the path (as a default).
        validationReport.project.name = path.basename(project.directory);
        validationReport.project.path = project.directory;
        validationReport.isValid = true;
        validationReport.details = '';
        break;
      }
      default: {
        validationReport.isValid = false;
        validationReport.details = `An unknown project type (${project.type}) was specified.`;
        break;
      }
    }

    return validationReport;
  }
}
