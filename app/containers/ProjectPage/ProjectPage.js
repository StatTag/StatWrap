/* eslint-disable react/destructuring-assignment */
/* eslint-disable object-shorthand */
/* eslint-disable prettier/prettier */
/* eslint-disable class-methods-use-this */
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import ResizablePanels from 'resizable-panels-react';
import Projects from '../../components/Projects/Projects';
import Project from '../../components/Project/Project';
import styles from './ProjectPage.css';

import {
  LOAD_PROJECT_LIST_REQUEST, LOAD_PROJECT_LIST_RESPONSE
} from '../../constants/messages';

class ProjectPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      projects: []
    };

    this.handleLoadProjectListResponse = this.handleLoadProjectListResponse.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.on(LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);
  }

  handleLoadProjectListResponse(sender, projects) {
    console.log(projects);
    this.setState({projects: projects});
  }

  refreshProjectsHandler() {
    ipcRenderer.send(LOAD_PROJECT_LIST_REQUEST);
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
            onRefresh={this.refreshProjectsHandler} />
          <Project name="My Amazing Project" />
        </ResizablePanels>
      </div>
    );
  }
}

export default ProjectPage;
