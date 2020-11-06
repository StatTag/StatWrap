/* eslint global-require: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `yarn build` or `yarn build-main`, this file is compiled to
 * `./app/main.prod.js` using webpack. This gives us some performance wins.
 *
 * @flow
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import username from 'username';
import log from 'electron-log';
import winston from 'winston';
import MenuBuilder from './menu';
import ProjectService, { ProjectFileFormatVersion } from './services/project';
import ProjectListService, { DefaultProjectListFile } from './services/projectList';
import ProjectTemplateService from './services/projectTemplate';
import AssetService from './services/assets/asset';
import FileHandler from './services/assets/handlers/fileHandler';
import Messages from './constants/messages';
import Constants from './constants/constants';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    // autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow = null;

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

ipcMain.on(Messages.LOAD_PROJECT_LIST_REQUEST, async event => {
  const response = {
    projects: null,
    error: false,
    errorMessage: ''
  };

  try {
    const userDataPath = app.getPath('userData');
    console.log(userDataPath);
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
        fullProject.tags = metadata.tags;
        fullProject.assets = metadata.assets;
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

ipcMain.on(Messages.LOAD_PROJECT_TEMPLATES_REQUEST, async event => {
  const response = {
    projectTemplates: null,
    error: false,
    errorMessage: ''
  };

  try {
    response.projectTemplates = projectTemplateService.loadProjectTemplates(
      path.join(__dirname, './templates')
    );
    response.error = false;
    response.errorMessage = '';
  } catch (e) {
    response.error = true;
    response.errorMessage = 'There was an unexpected error when loading the list of project types';
    console.log(e);
  }

  event.sender.send(Messages.LOAD_PROJECT_TEMPLATES_RESPONSE, response);
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
    projectId: null,
    error: false,
    errorMessage: ''
  };

  try {
    const validationReport = projectService.convertAndValidateProject(project);
    if (validationReport.isValid) {
      response.projectId = validationReport.project.id;

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
          } else {
            projectConfig = {
              formatVersion: ProjectFileFormatVersion,
              id: validationReport.project.id,
              name: validationReport.project.name,
              categories: []
            };
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

  try {
    const service = new AssetService([new FileHandler()]);
    response.assets = service.scan(project.path);

    // We have decided (for now) to keep notes separate from other asset metadata.  Notes will be
    // considered first-class attributes instead of being embedded in metadata.  Because of this
    // decision, we are adding in the notes after the regular asset scanning & processing.
    const projectConfig = projectService.loadProjectFile(project.path);
    projectService.addNotesToAssets(response.assets, projectConfig.assets);

    response.error = false;
    response.errorMessage = '';
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

ipcMain.on(Messages.WRITE_PROJECT_LOG, async (event, projectPath, action, level, user) => {
  const logger = winston.createLogger({
    level: 'verbose',
    defaultMeta: { user },
    format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
    transports: [
      new winston.transports.File({ filename: path.join(projectPath, 'statwrap-log.log') })
    ]
  });

  logger.log({ level: level || 'info', message: action });
  logger.close();
});

// Given a project, update its information and save that information to the project configuration
// file.
ipcMain.on(Messages.UPDATE_PROJECT_REQUEST, async (event, project) => {
  const response = {
    project,
    error: false,
    errorMessage: ''
  };

  try {
    if (project && project.id && project.path) {
      const projectConfig = projectService.loadProjectFile(project.path);
      projectConfig.assets = project.assets;
      projectService.saveProjectFile(project.path, projectConfig);
    } else {
      response.error = true;
      response.errorMessage =
        'No project was specified to be updated - this is an unexpected internal error.';
    }
  } catch (e) {
    response.error = true;
    response.errorMessage = 'There was an unexpected error when trying to create the project';
    console.log(e);
  }

  // console.log(response);
  // await sleep(5000);
  event.sender.send(Messages.UPDATE_PROJECT_RESPONSE, response);
});

// Perform all system information gathering
ipcMain.on(Messages.LOAD_SYSTEM_INFO_REQUEST, async event => {
  const response = {
    user: 'StatWrap',
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
