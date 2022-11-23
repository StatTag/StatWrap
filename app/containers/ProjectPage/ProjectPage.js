/* eslint-disable prettier/prettier */
/* eslint-disable object-shorthand */
/* eslint-disable class-methods-use-this */
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

      // UI element to inform us what the popup project list menu is attached to
      projectListMenuAnchor: null,

      // The dynamic details for the selected asset.  Maybe should think of a better way to pass this
      // down the compoonent chain, but for now it works
      assetDynamicDetails: null,

      // This key is part of a trick to get React to throw out and recreate the Create Project
      // dialog when we have disposed of it - either by creating a project or cancelling.  This
      // tracks a sequential number that, when changed, signals React that the dialog can be
      // recreated. We don't care what this key is, it just has to change.
      createProjectDialogKey: 0
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
    this.handleProjectUpdate = this.handleProjectUpdate.bind(this);
    this.handleUpdateProjectResponse = this.handleUpdateProjectResponse.bind(this);
    this.handleLoadProjectLogResponse = this.handleLoadProjectLogResponse.bind(this);
    this.handleRefreshProjectLog = this.handleRefreshProjectLog.bind(this);
    this.handleScanAssetDynamicDetailsResponse = this.handleScanAssetDynamicDetailsResponse.bind(this);
    this.handleAssetSelected = this.handleAssetSelected.bind(this);
    this.handleProjectExternallyChangedResponse = this.handleProjectExternallyChangedResponse.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);

    ipcRenderer.send(Messages.LOAD_CONFIGURATION_REQUEST);
    ipcRenderer.on(Messages.LOAD_CONFIGURATION_RESPONSE, this.handleLoadConfigurationResponse);

    ipcRenderer.on(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.on(Messages.REMOVE_PROJECT_LIST_ENTRY_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.on(Messages.SCAN_PROJECT_RESPONSE, this.handleScanProjectResponse);
    ipcRenderer.on(Messages.UPDATE_PROJECT_RESPONSE, this.handleUpdateProjectResponse);

    ipcRenderer.on(Messages.LOAD_PROJECT_LOG_RESPONSE, this.handleLoadProjectLogResponse);
    ipcRenderer.on(Messages.WRITE_PROJECT_LOG_RESPONSE, this.handleRefreshProjectLog);

    ipcRenderer.on(Messages.SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE, this.handleScanAssetDynamicDetailsResponse);

    ipcRenderer.on(Messages.PROJECT_EXTERNALLY_CHANGED_RESPONSE, this.handleProjectExternallyChangedResponse);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);
    ipcRenderer.removeListener(Messages.LOAD_CONFIGURATION_RESPONSE, this.handleLoadConfigurationResponse);
    ipcRenderer.removeListener(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.removeListener(Messages.REMOVE_PROJECT_LIST_ENTRY_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.removeListener(Messages.SCAN_PROJECT_RESPONSE, this.handleScanProjectResponse);
    ipcRenderer.removeListener(Messages.UPDATE_PROJECT_RESPONSE, this.handleUpdateProjectResponse);
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_LOG_RESPONSE, this.handleLoadProjectLogResponse);
    ipcRenderer.removeListener(Messages.WRITE_PROJECT_LOG_RESPONSE, this.handleRefreshProjectLog);
    ipcRenderer.removeListener(Messages.SCAN_ASSET_DYNAMIC_DETAILS_RESPONSE, this.handleScanAssetDynamicDetailsResponse);
    ipcRenderer.removeListener(Messages.PROJECT_EXTERNALLY_CHANGED_RESPONSE, this.handleProjectExternallyChangedResponse);
  }

  handleScanAssetDynamicDetailsResponse(sender, response) {
    this.setState({ assetDynamicDetails: response.details });
  }

  handleAssetSelected(asset) {
    // When an asset is selected, clear the existing dynamic details so they reload.
    this.setState({ assetDynamicDetails: null });
    ipcRenderer.send(Messages.SCAN_ASSET_DYNAMIC_DETAILS_REQUEST, this.state.selectedProject, asset);
  }

  handleLoadProjectListResponse(sender, response) {
    this.setState({ ...response, loaded: true });
  }

  handleLoadConfigurationResponse(sender, response) {
    this.setState({
      projectTemplates: response.projectTemplates,
      assetAttributes: response.assetAttributes
    });
  }

  handleRefreshProjectLog() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, this.state.selectedProject);
  }

  handleLoadProjectLogResponse(sender, response) {
    this.setState({ selectedProjectLogs: response });
  }

  refreshProjectsHandler() {
    this.setState({ loaded: false });
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
  }

  handleProjectExternallyChangedResponse(sender, response) {
    console.log(`Project updated: ${response.projectId}`);
    if (this.state.selectedProject && response && response.projectId === this.state.selectedProject.id) {
      console.log('Active project updated');
      ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, this.state.selectedProject);
    }
  }

  handleScanProjectResponse(sender, response) {
    if (!response || !response.project) {
      return;
    }

    this.setState(previousState => {
      const { selectedProject } = previousState;
      // If the currently selected project doesn't match the scan request, it may be related to
      // a previously selected project.  In this case, we will just ignore the response and not
      // do any updates to the UI.
      if (selectedProject.id !== response.project.id) {
        console.warn('Scan result for project does not match currently selected project');
        return { selectedProject };
      }

      const projectWithAssets = {...selectedProject,
        sourceControlEnabled: response.project.sourceControlEnabled,
        assets: response.error ? {error: response.error, errorMessage: response.errorMessage} : response.assets
      };
      return { selectedProject: projectWithAssets };
    });
  }

  handleFavoriteClick(id) {
    ipcRenderer.send(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, id);
  }

  handleAddProject() {
    this.setState({ addingProject: true });
  }

  handleCloseAddProject(refresh) {
    this.setState(prevState => (
      {
        addingProject: false,
        createProjectDialogKey: prevState.createProjectDialogKey + 1
      }
    ));

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
    switch(event) {
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
    this.setState({ selectedProject: project });
    ipcRenderer.send(Messages.SCAN_PROJECT_REQUEST, project);
    ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, project);
  }

  handleProjectUpdate(project, actionType, entityType, entityKey, title, description, details) {
    // Update our cached list of projects from which we get the selected projects.  We want to ensure
    // these are kept in sync with any updates.
    this.setState(prevState => {
      const { projects } = prevState;
      const foundIndex = projects.findIndex(x => x.id === project.id);
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
      user
    );
  }

  handleUpdateProjectResponse(sender, response) {
    if (response.error) {
      console.log(response.errorMessage);
    } else {
      // Update our cached list of projects from which we get the selected projects.  We want to ensure
      // these are kept in sync with any updates.
      this.setState(prevState => {
        const { projects } = prevState;
        const foundIndex = projects.findIndex(x => x.id === response.project.id);
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
            logs={this.state.selectedProjectLogs}
            onUpdated={this.handleProjectUpdate}
            onAssetSelected={this.handleAssetSelected}
            configuration={{ assetAttributes: this.state.assetAttributes }}
            assetDynamicDetails={this.state.assetDynamicDetails}
          />
        </ResizablePanels>
        <CreateProjectDialog
          key={this.state.createProjectDialogKey}
          projectTemplates={this.state.projectTemplates}
          open={this.state.addingProject}
          onClose={this.handleCloseAddProject} />
        <ProjectListEntryMenu
          anchorElement={this.state.projectListMenuAnchor ? this.state.projectListMenuAnchor.element : null}
          project={this.state.projectListMenuAnchor ? this.state.projectListMenuAnchor.project : null}
          onClose={this.handleCloseProjectListMenu}
          onMenuClick={this.handleClickProjectListMenu}
        />
      </div>
    );
  }
}

ProjectPage.contextType = UserContext;

export default ProjectPage;
