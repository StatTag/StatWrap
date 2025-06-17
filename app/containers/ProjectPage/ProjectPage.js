import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import ResizablePanels from 'resizable-panels-react';
import Projects from '../../components/Projects/Projects';
import Project from '../../components/Project/Project';
import CreateProjectDialog from '../CreateProjectDialog/CreateProjectDialog';
import ProjectListEntryMenu from '../../components/Projects/ProjectListEntryMenu/ProjectListEntryMenu';
import styles from './ProjectPage.css';
import UserContext from '../../contexts/User';

import Messages from '../../constants/messages';
import ChecklistUtil from '../../utils/checklist';

class ProjectPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // UI state flag to let us know when we're in the process of adding a new project
      addingProject: false,
      // List of project templates that can be used for new projects
      projectTemplates: [],
      // List of asset attributes with configuration information
      assetAttributes: [],
      // The list of projects that the user has configured
      projects: [],
      // UI state flag to let us know if the list of projects has been loaded or not
      loaded: false,
      // UI state flag to let us know if there was an error when trying to load the list of projects
      error: false,
      // If error is true, this will contain a user-friendly error message.
      errorMessage: '',

      // Information about the selected project (except logs)
      selectedProject: null,
      // The logs (aka Project Log) for the selected project
      selectedProjectLogs: null,
      // The checklist for the selected project
      selectedProjectChecklist: null,

      // UI element to inform us what the popup project list menu is attached to
      projectListMenuAnchor: null,

      // The dynamic details for the selected asset.  Maybe should think of a better way to pass this
      // down the compoonent chain, but for now it works
      assetDynamicDetails: null,

      // This key is part of a trick to get React to throw out and recreate the Create Project
      // dialog when we have disposed of it - either by creating a project or cancelling.  This
      // tracks a sequential number that, when changed, signals React that the dialog can be
      // recreated. We don't care what this key is, it just has to change.
      createProjectDialogKey: 0,

      // Show progress on scanning details about the project.  Allows the user to access what information
      // is available, yet be aware that more information may be arriving later.
      projectScanStatus: '',
    };

    this.handleLoadProjectListResponse = this.handleLoadProjectListResponse.bind(this);
    this.refreshProjectsHandler = this.refreshProjectsHandler.bind(this);
    this.handleFavoriteClick = this.handleFavoriteClick.bind(this);
    this.handleAddProject = this.handleAddProject.bind(this);
    this.handleCloseAddProject = this.handleCloseAddProject.bind(this);
    this.handleLoadConfigurationResponse = this.handleLoadConfigurationResponse.bind(this);
    this.handleProjectListEntryMenu = this.handleProjectListEntryMenu.bind(this);
    this.handleCloseProjectListMenu = this.handleCloseProjectListMenu.bind(this);
    this.handleClickProjectListMenu = this.handleClickProjectListMenu.bind(this);
    this.handleSelectProjectListItem = this.handleSelectProjectListItem.bind(this);
    this.handleScanProjectResponse = this.handleScanProjectResponse.bind(this);
    this.handleScanProjectResultsResponse = this.handleScanProjectResultsResponse.bind(this);
    this.handleProjectUpdate = this.handleProjectUpdate.bind(this);
    this.handleProjectRename = this.handleProjectRename.bind(this);
    this.handleChecklistUpdate = this.handleChecklistUpdate.bind(this);
    this.handleUpdateProjectResponse = this.handleUpdateProjectResponse.bind(this);
    this.handleLoadProjectLogResponse = this.handleLoadProjectLogResponse.bind(this);
    this.handleRefreshProjectLog = this.handleRefreshProjectLog.bind(this);
    this.handleRefreshProjectChecklist = this.handleRefreshProjectChecklist.bind(this);
    this.handleLoadProjectChecklistResponse = this.handleLoadProjectChecklistResponse.bind(this);
    this.handleScanAssetDynamicDetailsResponse =
      this.handleScanAssetDynamicDetailsResponse.bind(this);
    this.handleAssetSelected = this.handleAssetSelected.bind(this);
    this.handleProjectExternallyChangedResponse =
      this.handleProjectExternallyChangedResponse.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);

    ipcRenderer.send(Messages.LOAD_CONFIGURATION_REQUEST);
    ipcRenderer.on(Messages.LOAD_CONFIGURATION_RESPONSE, this.handleLoadConfigurationResponse);

    ipcRenderer.on(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.on(Messages.REMOVE_PROJECT_LIST_ENTRY_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.on(Messages.RENAME_PROJECT_LIST_ENTRY_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.on(Messages.SCAN_PROJECT_RESPONSE, this.handleScanProjectResponse);
    ipcRenderer.on(Messages.SCAN_PROJECT_RESULTS_RESPONSE, this.handleScanProjectResultsResponse);
    ipcRenderer.on(Messages.UPDATE_PROJECT_RESPONSE, this.handleUpdateProjectResponse);

    ipcRenderer.on(Messages.LOAD_PROJECT_LOG_RESPONSE, this.handleLoadProjectLogResponse);
    ipcRenderer.on(Messages.WRITE_PROJECT_LOG_RESPONSE, this.handleRefreshProjectLog);

    ipcRenderer.on(
      Messages.LOAD_PROJECT_CHECKLIST_RESPONSE,
      this.handleLoadProjectChecklistResponse,
    );
    ipcRenderer.on(Messages.WRITE_PROJECT_CHECKLIST_RESPONSE, this.handleRefreshProjectChecklist);

    ipcRenderer.on(
      Messages.SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE,
      this.handleScanAssetDynamicDetailsResponse,
    );

    ipcRenderer.on(
      Messages.PROJECT_EXTERNALLY_CHANGED_RESPONSE,
      this.handleProjectExternallyChangedResponse,
    );
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(
      Messages.LOAD_PROJECT_LIST_RESPONSE,
      this.handleLoadProjectListResponse,
    );
    ipcRenderer.removeListener(
      Messages.LOAD_CONFIGURATION_RESPONSE,
      this.handleLoadConfigurationResponse,
    );
    ipcRenderer.removeListener(
      Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE,
      this.refreshProjectsHandler,
    );
    ipcRenderer.removeListener(
      Messages.REMOVE_PROJECT_LIST_ENTRY_RESPONSE,
      this.refreshProjectsHandler,
    );
    ipcRenderer.removeListener(
      Messages.RENAME_PROJECT_LIST_ENTRY_RESPONSE,
      this.refreshProjectsHandler,
    );
    ipcRenderer.removeListener(Messages.SCAN_PROJECT_RESPONSE, this.handleScanProjectResponse);
    ipcRenderer.removeListener(
      Messages.SCAN_PROJECT_RESULTS_RESPONSE,
      this.handleScanProjectResultsResponse,
    );
    ipcRenderer.removeListener(Messages.UPDATE_PROJECT_RESPONSE, this.handleUpdateProjectResponse);
    ipcRenderer.removeListener(
      Messages.LOAD_PROJECT_LOG_RESPONSE,
      this.handleLoadProjectLogResponse,
    );
    ipcRenderer.removeListener(Messages.WRITE_PROJECT_LOG_RESPONSE, this.handleRefreshProjectLog);
    ipcRenderer.removeListener(
      Messages.LOAD_PROJECT_CHECKLIST_RESPONSE,
      this.handleLoadProjectChecklistResponse,
    );
    ipcRenderer.removeListener(
      Messages.WRITE_PROJECT_CHECKLIST_RESPONSE,
      this.handleRefreshProjectChecklist,
    );
    ipcRenderer.removeListener(
      Messages.SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE,
      this.handleScanAssetDynamicDetailsResponse,
    );
    ipcRenderer.removeListener(
      Messages.PROJECT_EXTERNALLY_CHANGED_RESPONSE,
      this.handleProjectExternallyChangedResponse,
    );
  }

  handleScanAssetDynamicDetailsResponse(sender, response) {
    this.setState({ assetDynamicDetails: response.details });
  }

  handleAssetSelected(asset) {
    // When an asset is selected, clear the existing dynamic details so they reload.
    this.setState({ assetDynamicDetails: null });
    ipcRenderer.send(
      Messages.SCAN_ASSET_DYNAMIC_DETAILS_REQUEST,
      this.state.selectedProject,
      asset,
    );
  }

  handleLoadProjectListResponse(sender, response) {
    this.setState({ ...response, loaded: true });
  }

  handleLoadConfigurationResponse(sender, response) {
    this.setState({
      projectTemplates: response.projectTemplates,
      assetAttributes: response.assetAttributes,
    });
  }

  handleRefreshProjectLog() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, this.state.selectedProject);
  }

  handleRefreshProjectChecklist() {
    ipcRenderer.send(Messages.LOAD_PROJECT_CHECKLIST_REQUEST, this.state.selectedProject);
  }

  // This handler writes the updated checklist to the checklist file, and also handles writing updates
  // to the log (if it succeeds).
  handleChecklistUpdate(
    project,
    checklist,
    actionType,
    entityType,
    entityKey,
    title,
    description,
    details,
  ) {
    const user = this.context;
    ipcRenderer.send(
      Messages.WRITE_PROJECT_CHECKLIST_REQUEST,
      project.path,
      checklist,
      actionType,
      entityType,
      entityKey,
      title,
      description,
      details,
      'info',
      user,
    );
  }

  /**
   * Called when a project log is loaded.
   *
   * @param {object} sender The sender of the message
   * @param {object} response Response containing a project ID and the log (if loaded)
   */
  handleLoadProjectLogResponse(sender, response) {
    if (!response || !response.projectId) {
      return;
    }

    // This is a lot of code, but the main thing is the line to set hasUpdate.  The rest of the
    // copying, etc. is just to ensure we're managing our state update appropriately for React.
    this.setState((prevState) => {
      const updatedProjects = [...prevState.projects];
      const index = updatedProjects.findIndex((project) => project.id === response.projectId);
      const updatedProject = { ...updatedProjects[index] };
      updatedProject.hasUpdate =
        response.updates && !response.updates.upToDate && !response.updates.firstView;
      updatedProjects[index] = updatedProject;
      return { projects: updatedProjects };
    });

    // Only if this log is for the selected project do we need to refresh the selected project logs.
    if (this.state.selectedProject && response.projectId === this.state.selectedProject.id) {
      this.setState({ selectedProjectLogs: response });
    }
  }

  /**
   * Called when a project checklist is loaded.
   * @param {object} sender The sender of the message
   * @param {object} response Response containing a project ID and the checklist (if loaded)
   */
  handleLoadProjectChecklistResponse(sender, response) {
    if (!response || !response.projectId) {
      return;
    }

    // If there is an error, we need to exit since there's nothing we can do for updates.
    if (response.error) {
      console.warn(response.errorMessage);
      return;
    }

    // Initialize the checklist file if it doesn't exist, for all the already existing projects
    const projectChecklist = ChecklistUtil.initializeChecklist();
    if (response.checklist && response.checklist.length === 0) {
      // response only returns project id, we need to find the project path
      const project = this.state.projects.find((p) => p.id === response.projectId);
      ipcRenderer.send(Messages.WRITE_PROJECT_CHECKLIST_REQUEST, project.path, projectChecklist);
    }

    if (this.state.selectedProject && response.projectId === this.state.selectedProject.id) {
      this.setState({ selectedProjectChecklist: response });
    }
  }

  refreshProjectsHandler() {
    this.setState({ loaded: false });
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
  }

  handleProjectExternallyChangedResponse(sender, response) {
    // If any project externally changes - even if it's not the one we currently have selected - we want
    // to reload the project log and checklist, so we can detect changes and notify (if needed);
    if (response && response.projectId && this.state.projects) {
      const foundProject = this.state.projects.find((project) => project.id === response.projectId);
      if (foundProject) {
        ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, foundProject);
        ipcRenderer.send(Messages.LOAD_PROJECT_CHECKLIST_REQUEST, foundProject);
      }
    }
  }

  handleScanProjectResponse(sender, response) {
    if (response === null || response === undefined || response.error) {
      this.setState({ projectScanStatus: 'error' });
    } else {
      this.setState({ projectScanStatus: 'started' });
    }
  }

  handleScanProjectResultsResponse(sender, response) {
    if (!response || !response.project) {
      console.warn('Received an invalid response from the project asset scan.');
      this.setState({ projectScanStatus: 'error' });
      return;
    }

    this.setState((previousState) => {
      const { selectedProject } = previousState;
      // If the currently selected project doesn't match the scan request, it may be related to
      // a previously selected project.  In this case, we will just ignore the response and not
      // do any updates to the UI.
      if (selectedProject.id !== response.project.id) {
        console.warn('Scan result for project does not match currently selected project');
        return { selectedProject };
      }

      const projectWithAssets = {
        ...selectedProject,
        sourceControlEnabled: response.project.sourceControlEnabled,
        assets: response.error
          ? { error: response.error, errorMessage: response.errorMessage }
          : response.assets,
      };
      return { selectedProject: projectWithAssets, projectScanStatus: null };
    });
  }

  handleFavoriteClick = (id) => {
    this.setState((prevState) => {
      const updatedProjects = prevState.projects.map((project) =>
        project.id === id ? { ...project, favorite: !project.favorite } : project,
      );

      const updatedSelectedProject =
        prevState.selectedProject?.id === id
          ? { ...prevState.selectedProject, favorite: !prevState.selectedProject.favorite }
          : prevState.selectedProject;

      return {
        projects: updatedProjects,
        selectedProject: updatedSelectedProject,
      };
    });

    ipcRenderer.send(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, id);
  };

  handleAddProject() {
    this.setState({ addingProject: true });
  }

  handleCloseAddProject(refresh) {
    this.setState((prevState) => ({
      addingProject: false,
      createProjectDialogKey: prevState.createProjectDialogKey + 1,
    }));

    if (refresh) {
      this.refreshProjectsHandler();
    }
  }

  handleProjectListEntryMenu(element, project) {
    this.setState({ projectListMenuAnchor: { element, project } });
  }

  handleCloseProjectListMenu() {
    this.setState({ projectListMenuAnchor: null });
  }

  handleClickProjectListMenu(event, projectId) {
    switch (event) {
      case Messages.TOGGLE_PROJECT_FAVORITE_REQUEST:
        this.handleFavoriteClick(projectId);
        break;
      case Messages.REMOVE_PROJECT_LIST_ENTRY_REQUEST:
        ipcRenderer.send(Messages.REMOVE_PROJECT_LIST_ENTRY_REQUEST, projectId);
        break;
      default:
        console.warn(`Unknown project list entry menu event: ${event}`);
    }
    this.setState({ projectListMenuAnchor: null });
  }

  handleSelectProjectListItem(project) {
    // Handle case where user clicks off of all projects (project is null)
    if (!project) {
      this.setState({ selectedProject: null });
      return;
    }

    // If the project is offline (has loadError), try to refresh its status
    if (project.loadError) {
      // First update the UI to show we're trying to reconnect
      this.setState({ selectedProject: { ...project, isReconnecting: true } });

      // Try to load the project file to check if it's now accessible
      ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);

      // Set up a one-time listener for the project list response
      const checkProjectStatus = (sender, response) => {
        if (response && response.projects) {
          const updatedProject = response.projects.find((p) => p.id === project.id);
          if (updatedProject) {
            // Remove the temporary reconnecting state
            const finalProject = { ...updatedProject, isReconnecting: undefined };
            this.setState({ selectedProject: finalProject });

            // If the project is now online, proceed with normal loading
            if (!updatedProject.loadError) {
              ipcRenderer.send(Messages.SCAN_PROJECT_REQUEST, finalProject);
              ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, finalProject);
              ipcRenderer.send(Messages.LOAD_PROJECT_CHECKLIST_REQUEST, finalProject);
            }
          }
        }
        // Remove the listener after we've handled the response
        ipcRenderer.removeListener(Messages.LOAD_PROJECT_LIST_RESPONSE, checkProjectStatus);
      };

      ipcRenderer.once(Messages.LOAD_PROJECT_LIST_RESPONSE, checkProjectStatus);
    } else {
      // Normal flow for online projects
      this.setState({ selectedProject: project });
      ipcRenderer.send(Messages.SCAN_PROJECT_REQUEST, project);
      ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, project);
      ipcRenderer.send(Messages.LOAD_PROJECT_CHECKLIST_REQUEST, project);
    }
  }

  handleProjectUpdate(project, actionType, entityType, entityKey, title, description, details) {
    // Update our cached list of projects from which we get the selected projects.  We want to ensure
    // these are kept in sync with any updates.
    this.setState((prevState) => {
      const { projects } = prevState;
      const foundIndex = projects.findIndex((x) => x.id === project.id);
      projects[foundIndex] = project;
      return { projects };
    });

    // The update project request will handle logging if it succeeds.  No additional logging call is
    // needed here.
    const user = this.context;
    ipcRenderer.send(
      Messages.UPDATE_PROJECT_REQUEST,
      project.path,
      actionType,
      entityType,
      entityKey,
      title,
      description,
      details,
      'info',
      user,
    );
  }

  handleProjectRename(project, name) {
    // Update our cached list of projects from which we get the selected projects.  We want to ensure
    // these are kept in sync with any updates.
    this.setState((prevState) => {
      const { projects } = prevState;
      const foundIndex = projects.findIndex((x) => x.id === project.id);
      projects[foundIndex].name = name;
      return { projects };
    });

    ipcRenderer.send(Messages.RENAME_PROJECT_LIST_ENTRY_REQUEST, project.id, name);
  }

  handleUpdateProjectResponse(sender, response) {
    if (response.error) {
      console.log(response.errorMessage);
    } else {
      // Update our cached list of projects from which we get the selected projects.  We want to ensure
      // these are kept in sync with any updates.
      this.setState((prevState) => {
        const { projects } = prevState;
        const foundIndex = projects.findIndex((x) => x.id === response.project.id);
        projects[foundIndex] = response.project;
        return { selectedProject: response.project, projects };
      });
    }
  }

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <ResizablePanels
          bkcolor="#fbfaff"
          displayDirection="row"
          width="100%"
          height="100vh"
          panelsSize={[25, 75]}
          sizeUnitMeasure="%"
          resizerColor="#f6f6f6"
          resizerSize="4px"
        >
          <Projects
            projects={this.state.projects}
            selectedProject={this.state.selectedProject}
            loaded={this.state.loaded}
            error={this.state.error}
            errorMessage={this.state.errorMessage}
            onRefresh={this.refreshProjectsHandler}
            onAddProject={this.handleAddProject}
            onFavoriteClick={this.handleFavoriteClick}
            onMenuClick={this.handleProjectListEntryMenu}
            onSelect={this.handleSelectProjectListItem}
          />
          <Project
            project={this.state.selectedProject}
            onFavoriteClick={this.handleFavoriteClick}
            logs={this.state.selectedProjectLogs}
            checklistResponse={this.state.selectedProjectChecklist}
            onUpdated={this.handleProjectUpdate}
            onRename={this.handleProjectRename}
            onAssetSelected={this.handleAssetSelected}
            onChecklistUpdated={this.handleChecklistUpdate}
            configuration={{ assetAttributes: this.state.assetAttributes }}
            assetDynamicDetails={this.state.assetDynamicDetails}
            scanStatus={this.state.projectScanStatus}
          />
        </ResizablePanels>
        <CreateProjectDialog
          key={this.state.createProjectDialogKey}
          projectTemplates={this.state.projectTemplates}
          open={this.state.addingProject}
          onClose={this.handleCloseAddProject}
        />
        <ProjectListEntryMenu
          anchorElement={
            this.state.projectListMenuAnchor ? this.state.projectListMenuAnchor.element : null
          }
          project={
            this.state.projectListMenuAnchor ? this.state.projectListMenuAnchor.project : null
          }
          onClose={this.handleCloseProjectListMenu}
          onMenuClick={this.handleClickProjectListMenu}
        />
      </div>
    );
  }
}

ProjectPage.contextType = UserContext;

export default ProjectPage;
