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
import log from 'electron-log';
import MenuBuilder from './menu';
import ProjectService from './services/project';
import ProjectListService, { DefaultProjectListFile } from './services/projectList';
import ProjectTemplateService from './services/projectTemplate';
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
    const service = new ProjectService();
    const listService = new ProjectListService();
    let projectsFromFile = listService.loadProjectListFromFile(
      path.join(userDataPath, DefaultProjectListFile)
    );

    // For all of the projects we have in our list, load the additional information that exists
    // within the project's local metadata file itself.
    projectsFromFile = projectsFromFile.map(project => {
      const metadata = service.loadProjectFile(project.path);
      // TODO What if the IDs don't match?  Handle that.  Also handle if file not found, file invalid, etc.
      // Remember that if the file can't be loaded, it may be because we're offline and the project is in
      // a network directory.
      const fullProject = { ...project };
      if (metadata == null) {
        fullProject.loadError = true;
      } else {
        fullProject.name = metadata.name;
        fullProject.tags = metadata.tags;
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
    const service = new ProjectTemplateService();
    response.projectTemplates = service.loadProjectTemplates();
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
    const service = new ProjectService();
    const validationReport = service.convertAndValidateProject(project);
    if (validationReport.isValid) {
      response.projectId = validationReport.project.id;

      switch (project.type) {
        case Constants.ProjectType.NEW_PROJECT_TYPE: {
          service.initializeNewProject(validationReport.project);
          break;
        }
        case Constants.ProjectType.EXISTING_PROJECT_TYPE: {
          // Let's see if a StatWrap project configuration file already exists at that location.
          // If so, we want to pick up the ID and details there, not replace it with anything new.
          // Note that it must at minimum have an id attribute to be considered valid.
          let projectConfig = service.loadProjectFile(validationReport.project.path);
          if (projectConfig && projectConfig.id) {
            validationReport.project.id = projectConfig.id;
            validationReport.project.name = projectConfig.name;
          } else {
            projectConfig = {
              id: validationReport.project.id,
              name: validationReport.project.name,
              categories: []
            };
            service.saveProjectFile(validationReport.project.path, projectConfig);
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
