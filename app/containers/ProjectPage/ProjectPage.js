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
      addingProject: false,
      projectTemplates: [],
      projects: [],
      loaded: false,
      error: false,
      errorMessage: '',
      projectListMenuAnchor: null,
      selectedProject: null,
      selectedProjectLogs: null,

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
    console.log(response);
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

    const {selectedProject} = this.state;
    // If the currently selected project doesn't match the scan request, it may be related to
    // a previously selected project.  In this case, we will just ignore the response and not
    // do any updates to the UI.
    if (selectedProject.id !== response.project.id) {
      console.warn('Scan result for project does not match currently selected project');
      return;
    }

    const projectWithAssets = {...selectedProject, assets: response.error ? {error: response.error, errorMessage: response.errorMessage} : response.assets};
    this.setState({ selectedProject: projectWithAssets });
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
        console.log(`Unknown project list entry menu event: ${event}`);
    }
    this.setState({ projectListMenuAnchor: null });
  }

  handleSelectProjectListItem(project) {
    this.setState({ selectedProject: project });
    ipcRenderer.send(Messages.SCAN_PROJECT_REQUEST, project);
    ipcRenderer.send(Messages.LOAD_PROJECT_LOG_REQUEST, project);
  }

  handleProjectUpdate(project, type, description, details) {
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
