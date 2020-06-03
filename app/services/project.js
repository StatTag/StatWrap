/* eslint-disable class-methods-use-this */
import { v4 as uuid } from 'uuid';
import Constants from '../constants/constants';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DefaultProjectFile = '.statwrap-project.json';
const MaximumFolderNameLength = 255;

export { DefaultProjectFile };

export default class ProjectService {
  loadStub() {
    return {
      id: '6ff79e02-4f24-4948-ac77-f3f1b67064e6',
      name: 'Test 3',
      tags: ['NIH', 'Grant', 'Team Science']
    };
  }

  // Create a new project and initialize it with configuration files and template
  // entries, if applicable.
  initializeNewProject(project) {
    // If the project is invalid, we won't initialize it
    if (!project) {
      throw new Error('The project is empty or undefined');
    }

    // Only attempt to create if it doesn't exist.  This will handle if someone is
    // trying to configure what they think is a new project, but already exists
    if (!fs.existsSync(project.path)) {
      fs.mkdirSync(project.path, { recursive: true });
    } else {
      // Determine if a project config file already exists.  If so, stop processing
      // the directory and just accept what's there.
      const existingConfig = this.loadProjectFile(project.path);
      if (existingConfig && existingConfig.id) {
        return;
      }
    }

    this.saveProjectFile(project.path, {
      id: project.id,
      name: project.name,
      categories: []
    });
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
