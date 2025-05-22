import { contextBridge, ipcRenderer, ipcMain } from 'electron';
import path from 'path';
import { cloneDeep, orderBy } from 'lodash';
import Messages from './constants/messages';
import AssetService from './services/assets/asset';
import ProjectService from './services/project';
import ProjectListService, { DefaultProjectListFile } from './services/projectList';
import SourceControlService from './services/sourceControl';
import FileHandler from './services/assets/handlers/file';
import PythonHandler from './services/assets/handlers/python';
import RHandler from './services/assets/handlers/r';
import SASHandler from './services/assets/handlers/sas';
import StataHandler from './services/assets/handlers/stata';
import AssetUtil from './utils/asset';
import ProjectUtil from './utils/project';
import JavaHandler from './services/assets/handlers/java';

const projectService = new ProjectService();
const projectListService = new ProjectListService();
const sourceControlService = new SourceControlService();

contextBridge.exposeInMainWorld('workerElectronBridge', {
  /**
   * Given a project, scan the details of that project, which includes scanning all assets registered
   * with the project for information.
   *
   * Internally this will handle converting the relative paths that are stored for assets (if they are
   * files or directories) into absolute paths.  This will allow all other code to assume that they
   * will be given absolute paths and not need to perform any path conversion.
   */
  listenForScanRequest: (callback) => ipcRenderer.on(Messages.SCAN_PROJECT_WORKER_REQUEST, (event, project, userDataPath) => {
    const response = {
      project,
      assets: null,
      error: false,
      errorMessage: '',
    };

    // If the project is null, it means nothing was selected in the list and we just want to reset.
    // This is not an error, so the error fields remain cleared.
    if (project === null) {
      event.sender.send(Messages.SCAN_PROJECT_WORKER_RESPONSE, response);
      callback(response);
      return;
    }

    (async () => {
      try {
        const service = new AssetService([
          new FileHandler(),
          new PythonHandler(),
          new RHandler(),
          new SASHandler(),
          new StataHandler(),
          new JavaHandler(),
        ]);
        response.assets = service.scan(project.path); // Returns absolute paths

        // We have decided (for now) to keep notes separate from other asset metadata.  Notes will be
        // considered first-class attributes instead of being embedded in metadata.  Because of this
        // decision, we are adding in the notes after the regular asset scanning & processing.
        let projectConfig = projectService.loadProjectFile(project.path);
        if (!projectConfig) {
          projectConfig = projectService.createProjectConfig(project.id, project.name);
        }

        if (!projectConfig.assets) {
          console.log(
            'No assets registered with the project - assuming this is a newly added project',
          );
        } else {
          // Convert relative to absolute paths, otherwise the note URIs won't match
          projectConfig.assets = AssetUtil.recursiveRelativeToAbsolutePath(
            project.path,
            projectConfig.assets,
          );
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
        response.project.people = projectConfig.people;
        response.project.assets = response.assets;
        response.project.sourceControlEnabled = await sourceControlService.hasSourceControlEnabled(
          project.path,
        );
        response.project.assetGroups = ProjectUtil.relativeToAbsolutePathForAssetGroups(
          project.path,
          projectConfig.assetGroups,
        );

        response.project.externalAssets = projectConfig.externalAssets;

        const saveResponse = ProjectUtil.saveProject(response.project, projectService);
        response.project = saveResponse.project; // Pick up any enrichment from saveProject
        if (saveResponse.error) {
          response.error = saveResponse.error;
          response.errorMessage = saveResponse.errorMessage;
        }

        projectListService.setProjectLastAccessed(
          response.project.id,
          path.join(userDataPath, DefaultProjectListFile),
        );
      } catch (e) {
        response.error = true;
        response.errorMessage =
          'There was an unexpected error when scanning the project for additional information';
        console.log(e);
      }

      event.sender.send(Messages.SCAN_PROJECT_WORKER_RESPONSE, response);
      callback(response);
    })();
  })
});
