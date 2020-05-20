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
      projectTypes: [],
      projects: [],
      loaded: false,
      error: false,
      errorMessage: ''
    };

    this.handleLoadProjectListResponse = this.handleLoadProjectListResponse.bind(this);
    this.refreshProjectsHandler = this.refreshProjectsHandler.bind(this);
    this.handleAddProject = this.handleAddProject.bind(this);
    this.handleCloseAddProject = this.handleCloseAddProject.bind(this);
    this.handleLoadProjectTypesResponse = this.handleLoadProjectTypesResponse.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);

    ipcRenderer.send(Messages.LOAD_PROJECT_TYPES_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_TYPES_RESPONSE, this.handleLoadProjectTypesResponse);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);
    ipcRenderer.removeListener(Messages.LOAD_PROJECT_TYPES_RESPONSE, this.handleLoadProjectTypesResponse);
  }

  handleLoadProjectListResponse(sender, response) {
    this.setState({...response, loaded: true});
  }

  handleLoadProjectTypesResponse(sender, response) {
    this.setState({projectTypes: response.projectTypes});
  }

  refreshProjectsHandler() {
    this.setState({loaded: false});
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
  }

  handleAddProject() {
    this.setState({addingProject: true});
  }

  handleCloseAddProject() {
    this.setState({addingProject: false});
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
            onAddProject={this.handleAddProject} />
          <Project name="My Amazing Project" />
        </ResizablePanels>
        <CreateProjectDialog
          projectTemplates={this.state.projectTypes}
          open={this.state.addingProject}
          onClose={this.handleCloseAddProject} />
      </div>
    );
  }
}

export default ProjectPage;
