/* eslint-disable no-underscore-dangle */
/* eslint-disable prettier/prettier */
/* eslint-disable no-param-reassign */
/* eslint-disable class-methods-use-this */
import { v4 as uuid } from 'uuid';
import lockfile from 'proper-lockfile';
import { cloneDeep } from 'lodash';
import Constants, { EntityType } from '../constants/constants';
import AssetUtil from '../utils/asset';
import ProjectUtil from '../utils/project';

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
        content: `# ${name}`,
      },
      categories: [],
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
        recursive: true,
      });
    }

    // Determine if a project config file already exists.  If so, stop processing
    // the directory and just accept what's there.
    const existingConfig = this.loadProjectFile(project.path);
    if (existingConfig && existingConfig.id) {
      return existingConfig;
    }

    const projectConfig = this.createProjectConfig(project.id, project.name);
    if (template && template.id && template.version) {
      projectConfig.template = { id: template.id, version: template.version };
    }

    this.saveProjectFile(project.path, projectConfig);
    return projectConfig;
  }

  lockProjectFile(projectPath) {
    const filePath = path.join(
      projectPath.replace('~', os.homedir),
      Constants.StatWrapFiles.BASE_FOLDER,
      DefaultProjectFile,
    );

    lockfile.lockSync(filePath);
  }

  unlockProjectFile(projectPath) {
    const filePath = path.join(
      projectPath.replace('~', os.homedir),
      Constants.StatWrapFiles.BASE_FOLDER,
      DefaultProjectFile,
    );

    lockfile.unlockSync(filePath);
  }

  // Load the project configuration file from a given project's directory.
  // It enforces internally the name of the file to be used, so the file
  // name should not be specified as part of projectPath.
  loadProjectFile(projectPath) {
    const filePath = path.join(
      projectPath.replace('~', os.homedir),
      Constants.StatWrapFiles.BASE_FOLDER,
      DefaultProjectFile,
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
    if (
      data &&
      data.description &&
      data.description.contentType === Constants.DescriptionContentType.URI
    ) {
      let descriptionFileContents = '';
      try {
        descriptionFileContents = fs.readFileSync(data.description.uri, { encoding: 'utf8' });
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
      Constants.StatWrapFiles.BASE_FOLDER,
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
      details: 'Not all validation checks were able to be completed',
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
      lastAccessed: new Date().toJSON(),
    };

    switch (project.type) {
      case Constants.ProjectType.NEW_PROJECT_TYPE: {
        // The user will have specified a new directory name, which needs to be
        // appended to the root folder.
        const sanitizedName = this.sanitizeFolderName(project.name);
        const projectDirectory = path.join(
          project.directory.replace('~', os.homedir),
          sanitizedName,
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
   * @param {object} assetsWithData The assets with notes and attributes that we will copy from.
   * @param {bool} followStructure Follow the asset structure hierarchy.  If this is true, it will only attempt to match
   *   children at the same level.  If false, it will search all descendants for the URI.  Because it is performing a URI
   *   search, this should not change the results, just improve speed.
   */
  addNotesAndAttributesToAssets(assets, assetsWithData, followStructure = true) {
    if (!assets) {
      throw new Error('The assets object must be specified');
    } else if (!assetsWithData) {
      throw new Error('The assets object with notes and attributes must be specified');
    }

    // First, add in any notes for the root asset. If they are not specified, create an
    // empty array.
    assets.notes = assetsWithData.notes || [];
    assets.attributes = assetsWithData.attributes || {};

    // If there are children, process those next.  We will only do this if there is a
    // corresponding child in the assetsWithData object.  We anticipate there can be
    // mismatch in these objects, so this situation is not an error.
    if (assets.children) {
      for (let index = 0; index < assets.children.length; index++) {
        const childAsset = assets.children[index];
        const childAssetWithData = followStructure
          ? AssetUtil.findChildAssetByUri(assetsWithData, childAsset.uri)
          : AssetUtil.findDescendantAssetByUri(assetsWithData, childAsset.uri);
        if (childAssetWithData) {
          this.addNotesAndAttributesToAssets(assets.children[index], childAssetWithData);
        } else {
          assets.children[index].notes = [];
          assets.children[index].attributes = {};
        }
      }
    }

    return assets;
  }

  /**
   * Utility function to update a note within a notes collection.
   * @param {object} entity The entity that contains a 'notes' collection that we are updating
   * @param {object} note The note object we are updating in the entity
   */
  _updateNote(entity, note) {
    const existingNote = entity.notes.find((x) => x.id === note.new.id);
    existingNote.content = note.new.content;
    existingNote.updated = note.new.updated;
  }

  /**
   * Utility function to delete a note within a notes collection.
   * @param {object} entity The entity that contains a 'notes' collection that we are deleting from
   * @param {object} note The note object we are deleting from the entity
   */
  _deleteNote(entity, note) {
    const index = entity.notes.findIndex((x) => x.id === note.id);
    if (index !== -1) {
      entity.notes.splice(index, 1);
    }
  }

  /**
   * Given a project path, load the project information, merge in a specific change (specified by
   * type and details), and return the updated object.
   *
   * @param {object} projectPath The path of the project to merge the update into
   * @param {string} actionType The specific type of update (from Constants.ActionType)
   * @param {string} entityType The type of entity that the update applies to (from Constants.EntityType)
   * @param {string} entityKey The identifier for the specific entity that requires the update to be applied.
   * @param {object} details The actual update/change that needs to be applied.  Content varies depending on
   *    the specific ActionType.
   * @returns The project with the update applied, or null if it could not be updated.
   *
   * **NOTE** - This implementation is a little bit wonky.  Partway through we refactored code to call this
   * merge method.  There is some existing code in the React components that is helping do some of the
   * checks prior to the actual merge.  So instead of everything being located here (as it really should be),
   * for now we're going to have some code in React, some code here.  That means we have some assumptions
   * we're going to make in our code here that we will implement.  TODO - further refactor to get all code
   * to service/util classes, and out of the React components.
   */
  loadAndMergeProjectUpdates(projectPath, actionType, entityType, entityKey, details) {
    if (!projectPath || !actionType || !entityType || !entityKey || !details) {
      return null;
    }

    const project = this.loadProjectFile(projectPath);
    if (!project) {
      return null;
    }

    // We need to add the project path to the project object once it's loaded.
    project.path = projectPath;

    // Because of the way our downstream code works, it expects the paths to be absolute.  Because we
    // have just loaded from the config file, we need to do that conversion before proceeding.
    project.assets = AssetUtil.recursiveRelativeToAbsolutePath(projectPath, project.assets);
    project.assetGroups = ProjectUtil.absoluteToRelativePathForAssetGroups(
      project.path,
      project.assetGroups,
    );

    // This code (per NOTE above) makes some assumptions that we already know for sure the
    // action is valid and can be completed, so we won't check - for example - if we're
    // updating a note if it exists.  The other code will have confirmed that.  We will need
    // to fold in those checks when we do the larger refactoring.
    switch (actionType) {
      case Constants.ActionType.NOTE_ADDED:
        if (entityType === EntityType.PROJECT) {
          if (!project.notes) {
            project.notes = [];
          }
          project.notes.push(details);
        } else if (entityType === EntityType.ASSET) {
          const asset = AssetUtil.findDescendantAssetByUri(project.assets, entityKey);
          if (!asset.notes) {
            asset.notes = [];
          }
          asset.notes.push(details);
        } else if (entityType === EntityType.PERSON) {
          const person = project.people.find((p) => p.id === entityKey);
          if (!person.notes) {
            person.notes = [];
          }
          person.notes.push(details);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.NOTE_UPDATED:
        // Assuming (for now) the UI code has confirmed these exist.  Need to move that code to here
        // in the future.
        if (entityType === EntityType.PROJECT) {
          this._updateNote(project, details);
        } else if (entityType === EntityType.ASSET) {
          const asset = AssetUtil.findDescendantAssetByUri(project.assets, entityKey);
          this._updateNote(asset, details);
        } else if (entityType === EntityType.PERSON) {
          const person = project.people.find((p) => p.id === entityKey);
          this._updateNote(person, details);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.NOTE_DELETED:
        // Assuming (for now) the UI code has confirmed these exist.  Need to move that code to here
        // in the future.
        if (entityType === EntityType.PROJECT) {
          this._deleteNote(project, details);
        } else if (entityType === EntityType.ASSET) {
          const asset = AssetUtil.findDescendantAssetByUri(project.assets, entityKey);
          this._deleteNote(asset, details);
        } else if (entityType === EntityType.PERSON) {
          const person = project.people.find((p) => p.id === entityKey);
          this._deleteNote(person, details);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.ATTRIBUTE_UPDATED:
        if (entityType === EntityType.ASSET) {
          const asset = AssetUtil.findDescendantAssetByUri(project.assets, entityKey);
          if (!asset.attributes) {
            asset.attributes = {};
          }
          asset.attributes[details.name] = details.value;
        } else {
          return null;
        }
        break;
      case Constants.ActionType.ABOUT_DETAILS_UPDATED:
        if (entityType === EntityType.PROJECT) {
          project.description = details.description;
          project.categories = details.categories;
        } else {
          return null;
        }
        break;
      case Constants.ActionType.PERSON_ADDED:
        if (entityType === EntityType.PROJECT) {
          if (!project.people) {
            project.people = [];
          }
          project.people.push(details);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.PERSON_UPDATED:
        if (entityType === EntityType.PROJECT) {
          const foundIndex = project.people.findIndex((p) => p.id === details.id);
          project.people[foundIndex] = {
            ...project.people[foundIndex],
            name: details.name,
            affiliation: details.affiliation,
            roles: details.roles,
          };
        } else {
          return null;
        }
        break;
      case Constants.ActionType.PERSON_DELETED:
        if (entityType === EntityType.PROJECT) {
          const foundIndex = project.people.findIndex((p) => p.id === details.id);
          project.people.splice(foundIndex, 1);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.ASSET_GROUP_ADDED:
        if (entityType === EntityType.PROJECT) {
          ProjectUtil.upsertAssetGroup(project, details);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.ASSET_GROUP_UPDATED:
        if (entityType === EntityType.PROJECT) {
          const oldAssetGroup = cloneDeep(
            project.assetGroups.find((x) => x.id === details.id),
          );
          ProjectUtil.upsertAssetGroup(project, details);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.ASSET_GROUP_DELETED:
        if (entityType === EntityType.PROJECT) {
          ProjectUtil.removeAssetGroup(project, details);
        } else {
          return null;
        }
        break;
      case Constants.ActionType.EXTERNAL_ASSET_ADDED:
          if (entityType === EntityType.PROJECT) {
            ProjectUtil.upsertExternalAsset(project, details);
          } else {
            return null;
          }
          break;
        case Constants.ActionType.EXTERNAL_ASSET_UPDATED:
          if (entityType === EntityType.PROJECT) {
            const oldAsset = cloneDeep(
              project.externalAssets.find((x) => x.uri === details.uri),
            );
            ProjectUtil.upsertExternalAsset(project, details);
          } else {
            return null;
          }
          break;
        case Constants.ActionType.EXTERNAL_ASSET_DELETED:
          if (entityType === EntityType.PROJECT) {
            ProjectUtil.removeExternalAsset(project, details);
          } else {
            return null;
          }
          break;
      default:
        return null;
    }

    return project;
  }
}
