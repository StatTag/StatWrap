/* eslint-disable object-shorthand */
/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import ResizablePanels from 'resizable-panels-react';
import Projects from '../../components/Projects/Projects';
import Project from '../../components/Project/Project';
import CreateProjectDialog from '../CreateProjectDialog/CreateProjectDialog';
import styles from './ProjectPage.css';

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
    this.handleToggleProjectFavoriteResponse = this.handleToggleProjectFavoriteResponse.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);

    ipcRenderer.send(Messages.LOAD_PROJECT_TEMPLATES_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_TEMPLATES_RESPONSE, this.handleLoadProjectTemplatesResponse);

    ipcRenderer.on(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, this.handleToggleProjectFavoriteResponse);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_TEMPLATES_RESPONSE, this.handleLoadProjectTemplatesResponse);
    ipcRenderer.removeListener(Messages.TOGGLE_PROJECT_FAVORITE_RESPONSE, this.handleToggleProjectFavoriteResponse);
  }

  handleLoadProjectListResponse(sender, response) {
    this.setState({...response, loaded: true});
  }

  handleLoadProjectTemplatesResponse(sender, response) {
    this.setState({projectTemplates: response.projectTemplates});
  }

  refreshProjectsHandler() {
    this.setState({loaded: false});
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
  }

  handleFavoriteClick(id) {
    ipcRenderer.send(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, id);
  }

  handleAddProject() {
    this.setState({addingProject: true});
  }

  handleCloseAddProject(refresh) {
    console.log(this.state);
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

  handleToggleProjectFavoriteResponse() {
    this.refreshProjectsHandler();
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
          resizerSize="5px"
        >
          <Projects
            projects={this.state.projects}
            loaded={this.state.loaded}
            error={this.state.error}
            errorMessage={this.state.errorMessage}
            onRefresh={this.refreshProjectsHandler}
            onAddProject={this.handleAddProject}
            onFavoriteClick={this.handleFavoriteClick} />
          <Project name="My Amazing Project" />
        </ResizablePanels>
        <CreateProjectDialog
          key={this.state.createProjectDialogKey}
          projectTemplates={this.state.projectTemplates}
          open={this.state.addingProject}
          onClose={this.handleCloseAddProject} />
      </div>
    );
  }
}

export default ProjectPage;
