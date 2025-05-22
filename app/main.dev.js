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
import { app, shell, BrowserWindow, ipcMain, screen } from 'electron';
// import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import { URL } from 'url';
import { orderBy } from 'lodash';
import { initialize, enable as enableRemote } from '@electron/remote/main';
import MenuBuilder from './menu';
import LogWatcherService from './services/logWatcher';
import ProjectService from './services/project';
import ProjectListService, { DefaultProjectListFile } from './services/projectList';
import SourceControlService from './services/sourceControl';
import ProjectTemplateService from './services/projectTemplate';
import AssetService from './services/assets/asset';
import UserService, { DefaultSettingsFile } from './services/user';
import Messages from './constants/messages';
import Constants from './constants/constants';
import AssetsConfig from './constants/assets-config';
import AssetUtil from './utils/asset';
import ProjectUtil from './utils/project';
import LogService from './services/log';
import ChecklistService from './services/checklist';

// Initialize @electron/remote
initialize();

export default class AppUpdater {
  // constructor() {
  //   log.transports.file.level = 'info';
  //   autoUpdater.logger = log;
  //   autoUpdater.checkForUpdatesAndNotify();
  // }
}

let mainWindow, workerWindow = null;

const projectTemplateService = new ProjectTemplateService();
const projectService = new ProjectService();
const projectListService = new ProjectListService();
const sourceControlService = new SourceControlService();
const logService = new LogService();
const checklistService = new ChecklistService();

// The LogWatcherService requires a window from which we can send messages, so we can't
// construct it until the BrowserWindow is created.
let logWatcherService = null;

let applicationUser = Constants.UndefinedDefaults.USER;

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
    extensions.map((name) => installer.default(installer[name], forceDownload)),
  ).catch(console.log);
};

const sleep = milliseconds => {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};


const createWindow = async () => {
  if (process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true') {
    await installExtensions();
  }

  // Determine what we want the starting application window size to be, based on the user's primary
  // display dimensions.  We will default to 70% of the height and width, with a minimum of 1024x768.
  const screenSize = screen.getPrimaryDisplay().workAreaSize;
  // Important note - you must do Math.floor.  If you use a decimal value for width or height, the value
  // will just be ignored and the default used.
  const defaultWidth = Math.max(Math.floor(screenSize.width * 0.7), 1024);
  const defaultHeight = Math.max(Math.floor(screenSize.height * 0.7), 768);

  mainWindow = new BrowserWindow({
    show: true, // Default was false, but setting to true.  We have a sporadic issue where the window wasn't displaying.  Let's see if this fixes it.
    width: defaultWidth,
    height: defaultHeight,
    webPreferences: {
      nodeIntegration: true,
      enableRemoteModule: true,
      contextIsolation: false,
    },
  });

  // Capture the typical click on an anchor link and determine if we want to
  // send this to the user's browser.
  mainWindow.webContents.on('will-navigate', (e, redirectUrl) => {
    if (handleUrl(redirectUrl)) {
      e.preventDefault();
    }
  });

  // This handler is separately used when a new window is requested because
  // a link uses _blank.  The above event will not be triggered in those
  // instances.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (handleUrl(url)) {
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Shared handler to take a URL and determine if we should open it in the user's
  // browser (returns true), or if we let electron handle it normally (false).
  async function handleUrl(url: string) {
    try {
      const parsedUrl = new URL(url);
      const { protocol } = parsedUrl;
      if (protocol === "http:" || protocol === "https:") {
        shell.openExternal(url); // Open in external browser
        return true;
      }
    } catch (err) {
      console.log('ERROR ' + err);
      // Errors are ignored, as we only want to check if the value is a valid url
    }

    return false;
  }

  // Enable electron remote
  enableRemote(mainWindow.webContents);

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
    if (workerWindow != null) {
      workerWindow.close();
    }
  });

  logWatcherService = new LogWatcherService(mainWindow);

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Create the background worker window
  workerWindow = new BrowserWindow({
    width: 800,
    height: 600,
    show: false,  // Only enable if needed for debugging
    webPreferences: {
      preload: path.join(__dirname, 'dist', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: true,
      sandbox: false
    }
  });

  workerWindow.loadURL(`file://${__dirname}/worker.html`);

  workerWindow.on('closed', () => {
    workerWindow = null;
  });

  // Remove this for now because we don't have auto-updates.
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

app.on('before-quit', () => {
  if (logWatcherService !== null) {
    logWatcherService.stop();
  }
});

/**
 * Load the user's project list.  This is specific to the user, and the path to the root
 * of the project folder will be specific to the user's current setup (e.g., OS, drive
 * mappings).
 *
 * Because this will return all metadata associated with the project, including information
 * about assets, it will handle converting the relative paths for files and directories
 * into absolute paths.  This will allow all other code to assume that they will be given
 * absolute paths and not need to perform any path conversion.
 */
ipcMain.on(Messages.LOAD_PROJECT_LIST_REQUEST, async (event) => {
  const response = {
    projects: null,
    error: false,
    errorMessage: '',
  };

  try {
    const userDataPath = app.getPath('userData');
    console.log(path.join(userDataPath, DefaultProjectListFile));
    let projectsFromFile = projectListService.loadProjectListFromFile(
      path.join(userDataPath, DefaultProjectListFile),
    );

    // For all of the projects we have in our list, load the additional information that exists
    // within the project's local metadata file itself.
    projectsFromFile = projectsFromFile.map((project) => {
      // Start the log file watcher for each project
      logWatcherService.add(
        path.join(project.path, Constants.StatWrapFiles.BASE_FOLDER, Constants.StatWrapFiles.LOG),
        project.id,
      );

      const metadata = projectService.loadProjectFile(project.path);
      // TODO What if the IDs don't match?  Handle that.  Also handle if file not found, file invalid, etc.
      // Remember that if the file can't be loaded, it may be because we're offline and the project is in
      // a network directory.
      const fullProject = { ...project };
      const isClonedProject = fs.existsSync(
        path.join(project.path, Constants.StatWrapFiles.BASE_FOLDER, Constants.StatWrapFiles.CLONED_PROJECT_MARKER)
      );

      if (metadata == null) {
        fullProject.loadError = true;
        fullProject.errorMessage = 'Failed to load the project details';
      } else {
        // Do not set the name from the project, unless our project list entry is empty.  This is because
        // the user can rename projects in their list however they want.  In the event it ends up as a
        // blank/empty/null string, we want to be sure there is something on the list the user can see.
        if (fullProject.name === null || fullProject.name === undefined || fullProject.name.trim() === '') {
          fullProject.name = metadata.name;
        }

        fullProject.assets = AssetUtil.recursiveRelativeToAbsolutePath(
          project.path,
          metadata.assets,
        );
        fullProject.description = metadata.description;
        fullProject.categories = metadata.categories;
        fullProject.notes = metadata.notes;
        fullProject.people = metadata.people;
        fullProject.assetGroups = ProjectUtil.relativeToAbsolutePathForAssetGroups(
          project.path,
          metadata.assetGroups,
        );

        fullProject.externalAssets = metadata.externalAssets;
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

/**
 * Load the StatWrap-wide configuration files in memory
 */
ipcMain.on(Messages.LOAD_CONFIGURATION_REQUEST, async (event) => {
  const response = {
    projectTemplates: null,
    assetAttributes: null,
    error: false,
    errorMessage: '',
  };

  try {
    response.projectTemplates = projectTemplateService.loadProjectTemplates(
      path.join(__dirname, './templates'),
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
    response.errorMessage =
      `${response.errorMessage}\r\nThere was an unexpected error when loading the list of asset attributes`.trim();
    console.log(e);
  }

  event.sender.send(Messages.LOAD_CONFIGURATION_RESPONSE, response);
});

ipcMain.on(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, async (event, projectId) => {
  const response = {
    projectId,
    error: false,
    errorMessage: '',
  };

  try {
    const userDataPath = app.getPath('userData');
    projectListService.toggleProjectFavorite(
      projectId,
      path.join(userDataPath, DefaultProjectListFile),
    );
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
    errorMessage: '',
  };

  try {
    const userDataPath = app.getPath('userData');
    projectListService.removeProjectEntry(
      projectId,
      path.join(userDataPath, DefaultProjectListFile),
    );
    logWatcherService.removeById(projectId);
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

ipcMain.on(Messages.RENAME_PROJECT_LIST_ENTRY_REQUEST, async (event, projectId, name) => {
  const response = {
    projectId,
    error: false,
    errorMessage: '',
  };

  try {
    const userDataPath = app.getPath('userData');
    projectListService.renameProjectEntry(
      projectId,
      name,
      path.join(userDataPath, DefaultProjectListFile),
    );
    response.error = false;
    response.errorMessage = '';
  } catch (e) {
    response.error = true;
    response.errorMessage =
      'There was an unexpected error when renaming the project';
    console.log(e);
  }

  event.sender.send(Messages.RENAME_PROJECT_LIST_ENTRY_RESPONSE, response);
});

/**
 * Create a new project - instantiating the project metadata within the project root,
 * and also registering the project within the user's project list.
 */
ipcMain.on(Messages.CREATE_PROJECT_REQUEST, async (event, project) => {
  const response = {
    project: {},
    statWrapConfigExisted: false,
    error: false,
    errorMessage: '',
  };

  try {
    const validationReport = projectService.convertAndValidateProject(project);
    if (validationReport.isValid) {
      response.project = {
        id: validationReport.project.id,
        path: validationReport.project.path,
        name: validationReport.project.name,
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
              project.template.version,
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
              validationReport.project.name,
            );

            projectService.saveProjectFile(validationReport.project.path, projectConfig);
          }
          break;
        }
        // In the CREATE_PROJECT_REQUEST handler, modify the CLONE_PROJECT_TYPE case:

        case Constants.ProjectType.CLONE_PROJECT_TYPE: {
          try {
            // Import the directory cloning utilities
            const { cloneDirectoryStructure, createStatWrapConfig } = require('./utils/DirectoryCloneUtils');

            // Create the target directory if it doesn't exist
            if (!fs.existsSync(validationReport.project.path)) {
              fs.mkdirSync(validationReport.project.path, { recursive: true });
            }

            // Clone the directory structure
            await cloneDirectoryStructure(project.sourceDirectory, validationReport.project.path);

            // Create the StatWrap configuration
            await createStatWrapConfig(validationReport.project.path, validationReport.project.id, validationReport.project.name);

            // Create a marker file to identify this as a cloned project
            const statWrapDir = path.join(validationReport.project.path, Constants.StatWrapFiles.BASE_FOLDER);
            if (!fs.existsSync(statWrapDir)) {
              fs.mkdirSync(statWrapDir, { recursive: true });
            }
            fs.writeFileSync(
              path.join(statWrapDir, Constants.StatWrapFiles.CLONED_PROJECT_MARKER),
              `This is a cloned project from ${project.sourceDirectory}`
            );

          } catch (error) {
            response.error = true;
            response.errorMessage = `Failed to clone project: ${error.message}`;
          }
          break;
        }
        default:
          response.error = true;
          response.errorMessage = `StatWrap is not able to create projects with a type of ${project.type}`;
          break;
      }

      if (!response.error) {
        const userDataPath = app.getPath('userData');
        projectListService.appendAndSaveProjectToList(
          validationReport.project,
          path.join(userDataPath, DefaultProjectListFile),
        );
        logWatcherService.add(
          path.join(
            validationReport.project.path,
            Constants.StatWrapFiles.BASE_FOLDER,
            Constants.StatWrapFiles.LOG,
          ),
          validationReport.project.id,
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


/**
 * Receives the reuqest from the main UI that a project needs to be scanned for additional details.
 * This dispatches the request to the worker to handle the actual processing, and lets the UI
 * know that the work has been started.
 */
ipcMain.on(Messages.SCAN_PROJECT_REQUEST, async (event, project) => {
  const response = {
    error: false,
    errorMessage: '',
  };

  try {
    workerWindow.webContents.send(Messages.SCAN_PROJECT_WORKER_REQUEST, project, app.getPath('userData'));
  } catch (error) {
    console.log(error);
    response.error = true;
    response.message = error;
  }

  event.sender.send(Messages.SCAN_PROJECT_RESPONSE, response);
});

/**
 * Response from the worker when the scan of a project is fully completed.  This just needs to
 * send the response to the main UI to display the results.
 */
ipcMain.on(Messages.SCAN_PROJECT_WORKER_RESPONSE, async (event, response) => {
  mainWindow.webContents.send(Messages.SCAN_PROJECT_RESULTS_RESPONSE, response);
});

/**
 * Write a single project log entry to the log file.
 */
ipcMain.on(
  Messages.WRITE_PROJECT_LOG_REQUEST,
  async (event, projectPath, type, title, description, details, level, user) => {
    logService.writeLog(projectPath, type, title, description, details, level, user);
    event.sender.send(Messages.WRITE_PROJECT_LOG_RESPONSE);
  },
);

/**
 * Read from disk the project log file.  Return all of the log entries.  If the project
 * has source control enabled, include those entries in the log list.
 */
ipcMain.on(Messages.LOAD_PROJECT_LOG_REQUEST, async (event, project) => {
  const response = {
    projectId: project ? project.id : null,
    logs: null,
    error: false,
    errorMessage: '',
  };
  if (!project) {
    response.error = true;
    response.errorMessage = 'No project was selected';
    event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
    return;
  }

  const userDataPath = app.getPath('userData');
  const projectLastAccessed = projectListService.getProjectLastAccessed(
    project.id,
    path.join(userDataPath, DefaultProjectListFile),
  );

  logService.loadLog(project.path, (error, logs) => {
    if (error || !logs || !logs.file) {
      response.error = true;
      response.errorMessage = 'There was an error reading the project log';
      event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
      return;
    }

    (async () => {
      const sourceControlEnabled = await sourceControlService.hasSourceControlEnabled(project.path);
      if (sourceControlEnabled) {
        sourceControlService
          .getHistory(project.path)
          .then((commits) => {
            if (commits) {
              response.logs = logs.file.concat(
                commits.map((c) => {
                  return {
                    level: 'info',
                    type: Constants.ActionType.VERSION_CONTROL_COMMIT,
                    title: 'Git Commit',
                    description: c.message,
                    // Timestamp is a Date object, and the log entries are all string, so we need to convert
                    // these to strings so that the ordering will work.
                    timestamp: c.timestamp.toISOString(),
                    user: c.committer,
                    details: c,
                  };
                }),
              );
              response.logs = orderBy(response.logs, 'timestamp', 'desc');
            } else {
              response.logs = logs.file;
            }
            response.updates = ProjectUtil.getProjectUpdates(
              projectLastAccessed,
              applicationUser,
              response.logs,
            );
            event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
            return true;
          })
          .catch(() => {
            response.error = true;
            response.errorMessage = 'There was an error reading the source control commit log';
            event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
          });
      } else {
        response.logs = logs.file;
        response.updates = ProjectUtil.getProjectUpdates(
          projectLastAccessed,
          applicationUser,
          response.logs,
        );
        event.sender.send(Messages.LOAD_PROJECT_LOG_RESPONSE, response);
      }
    })();
  });
});

/**
 * Write the project checklist to the checklist file.
 */
ipcMain.on(
  Messages.WRITE_PROJECT_CHECKLIST_REQUEST,
  async (event,
    projectPath,
    checklist,
    actionType,
    entityType,
    entityKey,
    title,
    description,
    details,
    level,
    user,) => {

    let response = {
      error: false,
      errorMessage: '',
    };

    try {
      checklistService.writeChecklist(projectPath, checklist);
      logService.writeLog(projectPath, actionType, title, description, details, level, user);
    } catch (e) {
      response.error = true;
      response.errorMessage = 'There was an error updating the project';
      console.log(e);
    }

    event.sender.send(Messages.WRITE_PROJECT_CHECKLIST_RESPONSE, response);
  },
);

/**
 * Load the project checklist from the checklist file.
 * Returns response with checklist data and error message if any.
 */
ipcMain.on(Messages.LOAD_PROJECT_CHECKLIST_REQUEST, async (event, project) => {
  const response = {
    projectId: project ? project.id : null,
    checklist: null,
    error: false,
    errorMessage: '',
  };
  if (!project) {
    response.error = true;
    response.errorMessage = 'No project was selected';
    event.sender.send(Messages.LOAD_PROJECT_CHECKLIST_RESPONSE, response);
    return;
  }

  // Is the project path accessible?  If not, we want to return an error without trying
  // to access the checklist configuration.
  if (!fs.existsSync(project.path)) {
    response.error = true;
    response.errorMessage = 'The selected project is not currently available';
    event.sender.send(Messages.LOAD_PROJECT_CHECKLIST_RESPONSE, response);
    return;
  }

  checklistService.loadChecklist(project.path, (error, checklist) => {
    // This checks for error when there is issue reading the checklist file,
    // not when the checklist file is not found. For the latter, we return an empty array.
    if (error && !checklist) {
      response.error = true;
      response.errorMessage = `There was an error reading the project checklist ${error}`;
      event.sender.send(Messages.LOAD_PROJECT_CHECKLIST_RESPONSE, response);
      return;
    }

    response.checklist = checklist;
    event.sender.send(Messages.LOAD_PROJECT_CHECKLIST_RESPONSE, response);
  });
});

/**
 * Given a project, update its information and save that information to the project
 * configuration file.
 */
ipcMain.on(
  Messages.UPDATE_PROJECT_REQUEST,
  async (
    event,
    projectPath,
    actionType,
    entityType,
    entityKey,
    title,
    description,
    details,
    level,
    user,
  ) => {
    let response = {
      project: null,
      error: false,
      errorMessage: '',
    };

    try {
      projectService.lockProjectFile(projectPath);
      const updatedProject = projectService.loadAndMergeProjectUpdates(
        projectPath,
        actionType,
        entityType,
        entityKey,
        details,
      );
      if (!updatedProject) {
        response.error = true;
        response.errorMessage = 'There was an error updating the project';
      } else {
        response = ProjectUtil.saveProject(updatedProject, projectService);
        if (response && !response.error) {
          logService.writeLog(projectPath, actionType, title, description, details, level, user);
        }
      }
    } catch (e) {
      response.error = true;
      response.errorMessage = 'There was an error updating the project';
      console.log(e);
    } finally {
      projectService.unlockProjectFile(projectPath);
    }

    // const response = saveProject(project, projectService);
    // console.log(response);
    // await sleep(5000);  // Use to test delays.  Leave disabled in production.
    event.sender.send(Messages.UPDATE_PROJECT_RESPONSE, response);
  },
);

/**
 * Perform all system information gathering
 */
ipcMain.on(Messages.LOAD_USER_INFO_REQUEST, async (event) => {
  const response = {
    user: Constants.UndefinedDefaults.USER,
    settings: {},
    error: false,
    errorMessage: '',
  };

  (async () => {
    const service = new UserService();
    try {
      applicationUser = await service.getUser();
      response.user = applicationUser;
      const userDataPath = app.getPath('userData');
      response.settings = service.loadUserSettingsFromFile(
        path.join(userDataPath, DefaultSettingsFile),
      );
    } catch (e) {
      response.error = true;
      response.errorMessage = 'There was an unexpected error when gathering user information';
      console.log(e);
    }
    event.sender.send(Messages.LOAD_USER_INFO_RESPONSE, response);
  })();
});

ipcMain.on(Messages.CREATE_UPDATE_PERSON_REQUEST, async (event, mode, project, person) => {
  const response = {
    project: null,
    person: null,
    error: false,
    errorMessage: '',
  };

  const projectMode = mode.toLowerCase() === 'project';
  if (projectMode && !project) {
    response.error = true;
    response.errorMessage = 'No project was provided';
    event.sender.send(Messages.CREATE_UPDATE_PERSON_RESPONSE, response);
    return;
  }

  if (!person) {
    response.error = true;
    response.errorMessage = 'No person information was provided';
    event.sender.send(Messages.CREATE_UPDATE_PERSON_RESPONSE, response);
    return;
  }

  const service = new UserService();
  if (!service.validateName(person.name)) {
    response.error = true;
    response.errorMessage =
      'The first name and last name are required, and must be at least one non-whitespace character in length.';
    event.sender.send(Messages.CREATE_UPDATE_PERSON_RESPONSE, response);
    return;
  }

  try {
    const userSettingsPath = path.join(app.getPath('userData'), DefaultSettingsFile);
    const settings = service.loadUserSettingsFromFile(userSettingsPath);
    response.person = service.upsertPersonInUserDirectory(settings, person);

    service.saveUserSettingsToFile(settings, userSettingsPath);
    response.project = { ...project };
  } catch (e) {
    response.error = true;
    response.errorMessage = e.message;
    response.person = { ...person };
    console.log(e);
  }
  event.sender.send(Messages.CREATE_UPDATE_PERSON_RESPONSE, response);
});

/**
 * Received when the current user's profile information needs to be saved
 */
ipcMain.on(Messages.SAVE_USER_PROFILE_REQUEST, async (event, user) => {
  const response = {
    user,
    error: false,
    errorMessage: '',
  };

  if (!user) {
    response.error = true;
    response.errorMessage = 'No user profile information was provided';
    event.sender.send(Messages.SAVE_USER_PROFILE_RESPONSE, response);
    return;
  }

  const service = new UserService();
  if (!service.validateName(user.name)) {
    response.error = true;
    response.errorMessage =
      'The first name and last name are required, and must be at least one non-whitespace character in length.';
    event.sender.send(Messages.SAVE_USER_PROFILE_RESPONSE, response);
    return;
  }

  try {
    const userSettingsPath = path.join(app.getPath('userData'), DefaultSettingsFile);
    const settings = service.loadUserSettingsFromFile(userSettingsPath);
    settings.user = user;
    service.saveUserSettingsToFile(settings, userSettingsPath);
  } catch (e) {
    response.error = true;
    response.errorMessage = e.message;
    console.log(e);
  }
  event.sender.send(Messages.SAVE_USER_PROFILE_RESPONSE, response);
});

/**
 * Several attributes related to assets are cached/saved.  However, some things may change on a more
 * frequent basis to the point we do not want to cache then and instead want to pull them in real time.
 * We'll call these 'dynamic details' to clarify.
 */
ipcMain.on(Messages.SCAN_ASSET_DYNAMIC_DETAILS_REQUEST, async (event, project, asset) => {
  const response = {
    project,
    asset,
    details: null,
    error: false,
    errorMessage: '',
  };

  // If the project or asset is null, it means nothing was selected in the list and we just want to reset.
  // This is not an error, so the error fields remain cleared.
  if (project === null || asset === null) {
    event.sender.send(Messages.SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE, response);
    return;
  }

  (async () => {
    try {
      // If source control isn't enabled, leave early.  This isn't an error we need to report.
      const hasSourceControlEnabled = await sourceControlService.hasSourceControlEnabled(
        project.path,
      );
      if (!hasSourceControlEnabled) {
        event.sender.send(Messages.SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE, response);
        return;
      }

      response.details = {
        // Just source control for now, but structuring to add more types of details in the future
        sourceControl: await sourceControlService.getFileHistory(project.path, asset.uri),
      };
    } catch (e) {
      response.error = true;
      response.errorMessage =
        'There was an unexpected error when scanning the asset for additional information';
      console.log(e);
    }

    event.sender.send(Messages.SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE, response);
  })();
});
