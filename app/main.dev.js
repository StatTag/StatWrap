/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import username from 'username';
import log from 'electron-log';
import winston from 'winston';
import MenuBuilder from './menu';
import ProjectService from './services/project';
import ProjectListService, { DefaultProjectListFile } from './services/projectList';
import ProjectTemplateService from './services/projectTemplate';
import AssetService from './services/assets/asset';
import FileHandler from './services/assets/handlers/file';
import PythonHandler from './services/assets/handlers/python';
import RHandler from './services/assets/handlers/r';
import Messages from './constants/messages';
import Constants from './constants/constants';
import AssetsConfig from './constants/assets-config';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    // autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow = null;

// For Winston, we need to tell it how far back we want to see logs from some anchor point
// (by default, the time we're looking at logs), as well as the number of logs to look at.
// These constants will take us back 100 years and give us a "really big number" of rows.
// Kind of a hacky way to say "give me all logs", but the current query API doesn't appear
// to have another way to specify that.
const LOG_TIME_LOOKBACK = 100 * 365 * 24 * 60 * 60 * 1000;
const LOG_ROW_LIMIT = 10000000000;

const projectTemplateService = new ProjectTemplateService();
const projectService = new ProjectService();

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS', 'REDUX_DEVTOOLS'];

  return Promise.all(
    extensions.map(name => installer.default(installer[name], forceDownload))
  ).catch(console.log);
};

const createWindow = async () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions();
  }

  mainWindow = new BrowserWindow({
    show: true, // Default was false, but setting to true.  We have a sporadic issue where the window wasn't displaying.  Let's see if this fixes it.
    width: 1024,
    height: 728,
    webPreferences: {
      nodeIntegration: true
    }
  });

  mainWindow.loadURL(`file://${__dirname}/app.html`);

  // @TODO: Use 'ready-to-show' event
  //        https://github.com/electron/electron/blob/master/docs/api/browser-window.md#using-ready-to-show-event
  mainWindow.webContents.on('did-finish-load', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Remove this for now because we don't have auto-updates.
  // eslint-disable-next-line
  //new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('ready', createWindow);

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) createWindow();
});

const saveProject = project => {
  const response = {
    project,
    error: false,
    errorMessage: ''
  };

  try {
    if (project && project.id && project.path) {
      let projectConfig = projectService.loadProjectFile(project.path);
      if (!projectConfig) {
        projectConfig = projectService.createProjectConfig(project.id, project.name);
      }
      projectConfig.description = project.description;
      projectConfig.categories = project.categories;
      projectConfig.assets = project.assets;
      projectConfig.notes = project.notes;
      projectService.saveProjectFile(project.path, projectConfig);

      // Reload the project configuration.  Depending on what's changed, we may need to re-load it
      // to reinstantiate certain data elements, like linked description files.
      const updatedProjectConfig = projectService.loadProjectFile(project.path);
      response.project.description = updatedProjectConfig.description;
    } else {
      response.error = true;
      response.errorMessage =
        'No project was specified to be saved - this is an unexpected internal error.';
    }
  } catch (e) {
    response.error = true;
    response.errorMessage = 'There was an unexpected error when trying to save the project';
    console.log(e);
  }

  return response;
};

ipcMain.on(Messages.LOAD_PROJECT_LIST_REQUEST, async event => {
  const response = {
    projects: null,
    error: false,
    errorMessage: ''
  };

  try {
    const userDataPath = app.getPath('userData');
    const listService = new ProjectListService();
    console.log(path.join(userDataPath, DefaultProjectListFile));
    let projectsFromFile = listService.loadProjectListFromFile(
      path.join(userDataPath, DefaultProjectListFile)
    );

    // For all of the projects we have in our list, load the additional information that exists
    // within the project's local metadata file itself.
    projectsFromFile = projectsFromFile.map(project => {
      const metadata = projectService.loadProjectFile(project.path);
      // TODO What if the IDs don't match?  Handle that.  Also handle if file not found, file invalid, etc.
      // Remember that if the file can't be loaded, it may be because we're offline and the project is in
      // a network directory.
      const fullProject = { ...project };
      if (metadata == null) {
        fullProject.loadError = true;
      } else {
        fullProject.name = metadata.name;
        fullProject.assets = metadata.assets;
        fullProject.description = metadata.description;
        fullProject.categories = metadata.categories;
        fullProject.notes = metadata.notes;
        fullProject.loadError = false;
      }
      return fullProject;
    });

    response.projects = projectsFromFile;
    response.error = false;
    response.errorMessage = '';
  } catch (e) {
    response.error = true;
    response.errorMessage = `The projects file is corrupt or invalid.  You may need to delete the file before StatWrap will work properly again.`;
    console.log(e);
  }

  event.sender.send(Messages.LOAD_PROJECT_LIST_RESPONSE, response);
});

ipcMain.on(Messages.LOAD_CONFIGURATION_REQUEST, async event => {
  const response = {
    projectTemplates: null,
    assetAttributes: null,
    error: false,
    errorMessage: ''
  };

  try {
    response.projectTemplates = projectTemplateService.loadProjectTemplates(
      path.join(__dirname, './templates')
    );
  } catch (e) {
    response.error = true;
    response.errorMessage = 'There was an unexpected error when loading the list of project types';
    console.log(e);
  }

  try {
    response.assetAttributes = AssetsConfig.attributes;
  } catch (e) {
    response.error = true;
    response.errorMessage = `${response.errorMessage}\r\nThere was an unexpected error when loading the list of asset attributes`.trim();
    console.log(e);
  }

  event.sender.send(Messages.LOAD_CONFIGURATION_RESPONSE, response);
});

ipcMain.on(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, async (event, projectId) => {
  const response = {
    projectId,
    error: false,
    errorMessage: ''
  };

  try {
    const service = new ProjectListService();
    const userDataPath = app.getPath('userData');
    service.toggleProjectFavorite(projectId, path.join(userDataPath, DefaultProjectListFile));
    response.error = false;
    response.errorMessage = '';
  } catch (e) {
    response.error = true;
    response.errorMessage =
      'There was an unexpected error when updating the project on the Favorite list';
    console.log(e);
  }

  event.sender.send(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, response);
});

ipcMain.on(Messages.REMOVE_PROJECT_LIST_ENTRY_REQUEST, async (event, projectId) => {
  const response = {
    projectId,
    error: false,
    errorMessage: ''
  };

  try {
    const service = new ProjectListService();
    const userDataPath = app.getPath('userData');
    service.removeProjectEntry(projectId, path.join(userDataPath, DefaultProjectListFile));
    response.error = false;
    response.errorMessage = '';
  } catch (e) {
    response.error = true;
    response.errorMessage =
      'There was an unexpected error when removing the project from your project list';
    console.log(e);
  }

  event.sender.send(Messages.REMOVE_PROJECT_LIST_ENTRY_RESPONSE, response);
});

ipcMain.on(Messages.CREATE_PROJECT_REQUEST, async (event, project) => {
  const response = {
    project: {},
    statWrapConfigExisted: false,
    error: false,
    errorMessage: ''
  };

  try {
    const validationReport = projectService.convertAndValidateProject(project);
    if (validationReport.isValid) {
      response.project = {
        id: validationReport.project.id,
        path: validationReport.project.path,
        name: validationReport.project.name
      };

      switch (project.type) {
        case Constants.ProjectType.NEW_PROJECT_TYPE: {
          // We expect there to be a template when creating a new project from StatWrap, even though
          // it is optional for projects to have one.
          if (!project.template) {
            response.error = true;
            response.errorMessage = `No project template was specified or selected`;
          } else {
            projectService.initializeNewProject(validationReport.project, project.template);
            projectTemplateService.createTemplateContents(
              validationReport.project.path,
              project.template.id,
              project.template.version
            );

            // We are going to do just a FileHandler scan of the assets.  Even when we have more handlers, we don't
            // need to store or cache those results in the project file (at least initially).  If that changes, we
            // should see if we can have a single initialization of the AssetService instead of doing it here and
            // elsewhere.
            const assetService = new AssetService([new FileHandler()]);
            validationReport.project.assets = assetService.scan(validationReport.project.path);
            projectService.saveProjectFile(validationReport.project.path, validationReport.project);
          }
          break;
        }
        case Constants.ProjectType.EXISTING_PROJECT_TYPE: {
          // Let's see if a StatWrap project configuration file already exists at that location.
          // If so, we want to pick up the ID and details there, not replace it with anything new.
          // Note that it must at minimum have an id attribute to be considered valid.
          let projectConfig = projectService.loadProjectFile(validationReport.project.path);
          if (projectConfig && projectConfig.id) {
            validationReport.project.id = projectConfig.id;
            validationReport.project.name = projectConfig.name;
            response.statWrapConfigExisted = true;
          } else {
            projectConfig = projectService.createProjectConfig(
              validationReport.project.id,
              validationReport.project.name
            );

            projectService.saveProjectFile(validationReport.project.path, projectConfig);
          }
          break;
        }
        // case Constants.ProjectType.CLONE_PROJECT_TYPE: {
        //   response.error = true;
        //   response.errorMessage = 'Not yet implemented';
        //   break;
        // }
        default:
          response.error = true;
          response.errorMessage = `StatWrap is not able to create projects with a type of ${project.type}`;
          break;
      }

      if (!response.error) {
        const listService = new ProjectListService();
        const userDataPath = app.getPath('userData');
        listService.appendAndSaveProjectToList(
          validationReport.project,
          path.join(userDataPath, DefaultProjectListFile)
        );
      }
    } else {
      response.error = true;
      response.errorMessage = validationReport.details;
    }
  } catch (e) {
    response.error = true;
    response.errorMessage = 'There was an unexpected error when trying to create the project';
    console.log(e);
  }

  event.sender.send(Messages.CREATE_PROJECT_RESPONSE, response);
});

// const sleep = milliseconds => {
//   return new Promise(resolve => setTimeout(resolve, milliseconds));
// };

// Given a project, scan the details of that project, which includes scanning all assets registered
// with the project for information.
ipcMain.on(Messages.SCAN_PROJECT_REQUEST, async (event, project) => {
  const response = {
    project,
    assets: null,
    error: false,
    errorMessage: ''
  };

  // If the project is null, it means nothing was selected in the list and we just want to reset.
  // This is not an error, so the error fields remain cleared.
  if (project === null) {
    event.sender.send(Messages.SCAN_PROJECT_RESPONSE, response);
    return;
  }

  try {
    const service = new AssetService([new FileHandler(), new PythonHandler(), new RHandler()]);
    response.assets = service.scan(project.path);

    // We have decided (for now) to keep notes separate from other asset metadata.  Notes will be
    // considered first-class attributes instead of being embedded in metadata.  Because of this
    // decision, we are adding in the notes after the regular asset scanning & processing.
    let projectConfig = projectService.loadProjectFile(project.path);
    if (!projectConfig) {
      projectConfig = projectService.createProjectConfig(project.id, project.name);
    }

    if (!projectConfig.assets) {
      console.log('No assets registered with the project - assuming this is a newly added project');
    } else {
      projectService.addNotesAndAttributesToAssets(response.assets, projectConfig.assets);
    }

    // When we scan a project, we need to detect all possible changes that could exist from the existing
    // project entry that gets sent.  Otherwise the UI can get out of sync.  We need to make sure we merge
    // in additional properties here for the project that's going back.  Keep in mind that the project
    // object we get is structured differently from the stored project config, which is why we need to
    // add parts instead of just using the whole object.
    response.project.categories = projectConfig.categories;
    response.project.description = projectConfig.description;
    response.project.notes = projectConfig.notes;
    response.project.assets = response.assets;

    const saveResponse = saveProject(response.project);
    response.project = saveResponse.project; // Pick up any enrichment from saveProject
    if (saveResponse.error) {
      response.error = saveResponse.error;
      response.errorMessage = saveResponse.errorMessage;
    }
  } catch (e) {
    response.error = true;
    response.errorMessage =
      'There was an unexpected error when scanning the project for additional information';
    console.log(e);
  }

  // console.log(response);
  // await sleep(5000);
  event.sender.send(Messages.SCAN_PROJECT_RESPONSE, response);
});

ipcMain.on(
  Messages.WRITE_PROJECT_LOG_REQUEST,
  async (event, projectPath, type, title, description, details, level, user) => {
    const logger = winston.createLogger({
      level: 'verbose',
      defaultMeta: { user },
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      transports: [
        new winston.transports.File({
          filename: path.join(
            projectPath,
            Constants.StatWrapFiles.BASE_FOLDER,
            Constants.StatWrapFiles.LOG
          )
        })
      ]
    });

    logger.log({
      level: level || 'info',
      type: type || Constants.UndefinedDefaults.ACTION_TYPE,
      title: title || Constants.UndefinedDefaults.ACTION_TYPE,
      description,
      details
    });
    logger.close();

    event.sender.send(Messages.WRITE_PROJECT_LOG_RESPONSE);
  }
);

ipcMain.on(Messages.LOAD_PROJECT_LOG_REQUEST, async (event, project) => {
  const response = {
    logs: null,
    error: false,
    errorMessage: ''
  };
  if (!project) {
    response.error = true;
    response.errorMessage = 'No project was selected';
    event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
    return;
  }

  const logger = winston.createLogger({
    level: 'verbose',
    transports: [
      new winston.transports.File({
        filename: path.join(
          project.path,
          Constants.StatWrapFiles.BASE_FOLDER,
          Constants.StatWrapFiles.LOG
        )
      })
    ]
  });

  const options = {
    from: new Date() - LOG_TIME_LOOKBACK,
    until: new Date(),
    limit: LOG_ROW_LIMIT,
    start: 0
  };

  logger.query(options, (error, logs) => {
    if (error || !logs || !logs.file) {
      response.error = true;
      response.errorMessage = 'There was an error reading the project log';
      event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
    }
    response.logs = logs.file;
    event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
  });
});

// Given a project, update its information and save that information to the project configuration
// file.
ipcMain.on(Messages.UPDATE_PROJECT_REQUEST, async (event, project) => {
  const response = saveProject(project);

  // console.log(response);
  // await sleep(5000);
  event.sender.send(Messages.UPDATE_PROJECT_RESPONSE, response);
});

// Perform all system information gathering
ipcMain.on(Messages.LOAD_SYSTEM_INFO_REQUEST, async event => {
  const response = {
    user: Constants.UndefinedDefaults.USER,
    error: false,
    errorMessage: ''
  };

  (async () => {
    try {
      const user = await username();
      response.user = user;
    } catch (e) {
      response.error = true;
      response.errorMessage = 'There was an unexpected error when gathering system information';
      console.log(e);
    }
    event.sender.send(Messages.LOAD_SYSTEM_INFO_RESPONSE, response);
  })();
});
