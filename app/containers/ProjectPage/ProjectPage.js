/* eslint-disable object-shorthand */
/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import ResizablePanels from 'resizable-panels-react';
import Projects from '../../components/Projects/Projects';
import Project from '../../components/Project/Project';
import CreateProjectDialog from '../CreateProjectDialog/CreateProjectDialog';
import ProjectListEntryMenu from '../../components/Projects/ProjectListEntryMenu/ProjectListEntryMenu';
import styles from './ProjectPage.css';
import UserContext from '../../components/User/User';

import Messages from '../../constants/messages';

class ProjectPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      // UI state flag to let us know when we're in the process of adding a new project
      addingProject: false,
      // List of project templates that can be used for new projects
      projectTemplates: [],
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
      // The logs (aka News Feed) for the selected project
      selectedProjectLogs: null,

      // UI element to inform us what the popup project list menu is attached to
      projectListMenuAnchor: null,

      // This key is part of a trick to get React to throw out and recreate the Create Project
      // dialog when we have disposed of it - either by creating a project or cancelling.  This
      // tracks a sequential number that, when changed, signals React that the dialog can be
      // recreated. We don't care what this key is, it just has to change.
      createProjectDialogKey: 0
    };

    this.handleLoadProjectListResponse = this.handleLoadProjectListResponse.bind(this);
    this.refreshProjectsHandler = this.refreshProjectsHandler.bind(this);
    this.handleAddProject = this.handleAddProject.bind(this);
    this.handleCloseAddProject = this.handleCloseAddProject.bind(this);
    this.handleLoadProjectTemplatesResponse = this.handleLoadProjectTemplatesResponse.bind(this);
    this.handleProjectListEntryMenu = this.handleProjectListEntryMenu.bind(this);
    this.handleCloseProjectListMenu = this.handleCloseProjectListMenu.bind(this);
    this.handleClickProjectListMenu = this.handleClickProjectListMenu.bind(this);
    this.handleSelectProjectListItem = this.handleSelectProjectListItem.bind(this);
    this.handleScanProjectResponse = this.handleScanProjectResponse.bind(this);
    this.handleProjectUpdate = this.handleProjectUpdate.bind(this);
    this.handleUpdateProjectResponse = this.handleUpdateProjectResponse.bind(this);
    this.handleLoadProjectLogResponse = this.handleLoadProjectLogResponse.bind(this);
    this.handleRefreshProjectLog = this.handleRefreshProjectLog.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);

    ipcRenderer.send(Messages.LOAD_PROJECT_TEMPLATES_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_TEMPLATES_RESPONSE, this.handleLoadProjectTemplatesResponse);

    ipcRenderer.on(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.on(Messages.REMOVE_PROJECT_LIST_ENTRY_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.on(Messages.SCAN_PROJECT_RESPONSE, this.handleScanProjectResponse);
    ipcRenderer.on(Messages.UPDATE_PROJECT_RESPONSE, this.handleUpdateProjectResponse);

    ipcRenderer.on(Messages.LOAD_PROJECT_LOG_RESPONSE, this.handleLoadProjectLogResponse);
    ipcRenderer.on(Messages.WRITE_PROJECT_LOG_RESPONSE, this.handleRefreshProjectLog)
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_TEMPLATES_RESPONSE, this.handleLoadProjectTemplatesResponse);
    ipcRenderer.removeListener(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.removeListener(Messages.REMOVE_PROJECT_LIST_ENTRY_RESPONSE, this.refreshProjectsHandler);
    ipcRenderer.removeListener(Messages.SCAN_PROJECT_RESPONSE, this.handleScanProjectResponse);
    ipcRenderer.removeListener(Messages.UPDATE_PROJECT_RESPONSE, this.handleUpdateProjectResponse);
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_LOG_RESPONSE, this.handleLoadProjectLogResponse);
    ipcRenderer.removeListener(Messages.WRITE_PROJECT_LOG_RESPONSE, this.handleRefreshProjectLog);
  }

  handleLoadProjectListResponse(sender, response) {
    this.setState({...response, loaded: true});
  }

  handleLoadProjectTemplatesResponse(sender, response) {
    this.setState({projectTemplates: response.projectTemplates});
  }

  handleRefreshProjectLog() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, this.state.selectedProject);
  }

  handleLoadProjectLogResponse(sender, response) {
    this.setState({selectedProjectLogs: response});
  }

  refreshProjectsHandler() {
    this.setState({loaded: false});
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
  }

  handleScanProjectResponse(sender, response) {
    if (!response || !response.project) {
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

      const projectWithAssets = {...selectedProject, assets: response.error ? {error: response.error, errorMessage: response.errorMessage} : response.assets};
      return { selectedProject: projectWithAssets };
    });
  }

  handleFavoriteClick(id) {
    ipcRenderer.send(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, id);
  }

  handleAddProject() {
    this.setState({addingProject: true});
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

  handleProjectUpdate(project, type, description, details) {
    // Update our cached list of projects from which we get the selected projects.  We want to ensure
    // these are kept in sync with any updates.
    const { projects } = this.state;
    const foundIndex = projects.findIndex(x => x.id === project.id);
    projects[foundIndex] = project;
    this.setState({ projects });

    ipcRenderer.send(Messages.UPDATE_PROJECT_REQUEST, project);

    if (type && type !== '') {
      const user = this.context;
      ipcRenderer.send(Messages.WRITE_PROJECT_LOG_REQUEST, project.path, type, description, details, 'info', user);
    }
  }

  handleUpdateProjectResponse(sender, response) {
     if (response.error) {
        console.log(response.errorMessage);
     }
     else {
       this.setState({ selectedProject: response.project });
     }
  }

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <ResizablePanels
          bkcolor="#fff"
          displayDirection="row"
          width="100%"
          height="100vh"
          panelsSize={[25, 75]}
          sizeUnitMeasure="%"
          resizerColor="#000"
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
            onSelect={this.handleSelectProjectListItem}/>
          <Project project={this.state.selectedProject} logs={this.state.selectedProjectLogs} onUpdated={this.handleProjectUpdate} />
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
