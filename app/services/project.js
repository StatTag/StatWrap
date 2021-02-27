/* eslint-disable prettier/prettier */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
import { v4 as uuid } from 'uuid';
import Constants from '../constants/constants';
import AssetUtil from '../utils/asset';

const fs = require('fs');
const os = require('os');
const path = require('path');

const DefaultProjectFile = '.statwrap-project.json';
const ProjectFileFormatVersion = '1';
const MaximumFolderNameLength = 255;

export { DefaultProjectFile, ProjectFileFormatVersion };

export default class ProjectService {
  /**
   * Create a new object that contains the basic elements of a project configuration.  This will only
   * create the structure, not save it to disk.  For that, see initializeNewProject.
   *
   * @param {string} id UUID for the project. If empty/null, one will be created.
   * @param {string} name The name of the project
   */
  createProjectConfig(id, name) {
    const config = {
      formatVersion: ProjectFileFormatVersion,
      id: id || uuid(),
      name,
      description: {
        contentType: Constants.DescriptionContentType.MARKDOWN,
        content: `# ${name}`
      },
      categories: []
    };
    return config;
  }

  /**
   * Create a new project and initialize it with configuration files and template
   * entries, if applicable.
   * @param {object} project
   * @param {object} template
   */
  initializeNewProject(project, template) {
    // If the project is invalid, we won't initialize it
    if (!project) {
      throw new Error('The project is empty or undefined');
    }

    // Only attempt to create if it doesn't exist.  This will handle if someone is
    // trying to configure what they think is a new project, but already exists
    try {
      fs.accessSync(project.path);
    } catch (err) {
      fs.mkdirSync(project.path, { recursive: true });
    }

    const configFolder = path.join(project.path, Constants.StatWrapFiles.BASE_FOLDER);
    // Determine if the StatWrap config folder exists.  If not, create it.
    try {
      fs.accessSync(configFolder);
    } catch (err) {
      fs.mkdirSync(configFolder, {
        recursive: true
      });
    }

    // Determine if a project config file already exists.  If so, stop processing
    // the directory and just accept what's there.
    const existingConfig = this.loadProjectFile(project.path);
    if (existingConfig && existingConfig.id) {
      return;
    }

    const projectConfig = this.createProjectConfig(project.id, project.name);
    if (template && template.id && template.version) {
      projectConfig.template = { id: template.id, version: template.version };
    }

    this.saveProjectFile(project.path, projectConfig);
    return projectConfig;
  }

  // Load the project configuration file from a given project's directory.
  // It enforces internally the name of the file to be used, so the file
  // name should not be specified as part of projectPath.
  loadProjectFile(projectPath) {
    const filePath = path.join(
      projectPath.replace('~', os.homedir),
      Constants.StatWrapFiles.BASE_FOLDER,
      DefaultProjectFile
    );

    try {
      fs.accessSync(filePath);
    } catch {
      return null;
    }

    const fileContents = fs.readFileSync(filePath);
    const data = JSON.parse(fileContents.toString());

    // If the user has linked their project description to a URI, we will
    // attempt to load it.  If we fail, we will put in the content an error
    // informing the user that the file couldn't be found or loaded.
    if (data && data.description && data.description.contentType === Constants.DescriptionContentType.URI) {
      let descriptionFileContents = '';
      try {
        descriptionFileContents = fs.readFileSync(data.description.uri, { "encoding": "utf8"});
      } catch (err) {
        descriptionFileContents = `**Unable to load description file at ${data.description.uri}**\r\n${err}`;
      }
      data.description.uriContent = descriptionFileContents;
    }
    return data;
  }

  // Utility function that takes a project object as input, and returns a copy that excludes
  // any extra attributes that shouldn't be saved to the config file.  This will allow us to
  // externally enrich the project object and not worry about that data being saved off.
  stripExtraProjectData(project) {
    // const cleanProject = { formatVersion: project.formatVersion, id: project.id, uri: project.uri, lastAccessed: project.lastAccessed }
    return project;
  }

  // Save the project configuration file to a given project's directory.
  // It enforces internally the name of the file to be used, so the file
  // name should not be specified as part of projectPath.
  // Note that this entirely overwrites the project configuration file, so
  // the project parameter should include all of the project attributes.
  saveProjectFile(projectPath, project) {
    // If the path to the project doesn't exist, we can't proceed.  accessSync will
    // throw an exception if there's a failure
    fs.accessSync(projectPath);

    // If the project doesn't at least have an ID, we won't save it.
    if (!project || !project.id) {
      throw new Error('Unable to save the project configuration because it is empty');
    } else if (project.id.trim() === '') {
      throw new Error('Unable to save the project configuration because it is missing an ID');
    }

    // Only attempt to create our config base folder within the project if it doesn't exist.
    // This will handle if someone is trying to configure what they think is a new project,
    // but it actually already exists
    const configFolderPath = path.join(
      projectPath.replace('~', os.homedir),
      Constants.StatWrapFiles.BASE_FOLDER
    );
    try {
      fs.accessSync(configFolderPath);
    } catch (err) {
      fs.mkdirSync(configFolderPath, { recursive: true });
    }

    const filePath = path.join(configFolderPath, DefaultProjectFile);
    fs.writeFileSync(filePath, JSON.stringify(this.stripExtraProjectData(project)));
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
      formatVersion: ProjectFileFormatVersion,
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

  /**
   * Given two assets objects, take the notes from assetsWithNotes and add those notes into the assets object.  This
   * will modify the assets object directly, but will also return the assets object.
   *
   * @param {object} assets The assets object to merge notes into.  Any notes already in the assets will be replaced.
   * @param {object} assetsWithNotes The assets with notes that we will read notes from.
   */
  addNotesToAssets(assets, assetsWithNotes) {
    if (!assets) {
      throw new Error('The assets object must be specified');
    } else if (!assetsWithNotes) {
      throw new Error('The assets object with notes must be specified');
    }

    // First, add in any notes for the root asset. If they are not specified, create an
    // empty array.
    assets.notes = assetsWithNotes.notes || [];

    // If there are children, process those next.  We will only do this if there is a
    // corresponding child in the assetsWithNotes object.  We anticipate there can be
    // mismatch in these objects, so this situation is not an error.
    if (assets.children) {
      for (let index = 0; index < assets.children.length; index++) {
        const childAsset = assets.children[index];
        const childAssetWithNotes = AssetUtil.findChildAssetByUri(assetsWithNotes, childAsset.uri);
        if (childAssetWithNotes) {
          this.addNotesToAssets(assets.children[index], childAssetWithNotes);
        } else {
          assets.children[index].notes = [];
        }
      }
    }

    return assets;
  }
}
