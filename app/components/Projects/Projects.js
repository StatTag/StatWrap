import React, { Component } from 'react';
import ResizablePanels from 'resizable-panels-react';
import IconButton from '@material-ui/core/IconButton';
import AddCircle from '@material-ui/icons/AddCircle';
import RefreshIcon from '@material-ui/icons/Refresh';
import ProjectGroup from './ProjectGroup/ProjectGroup';
import styles from './Projects.css';

export default class Projects extends Component {
  render() {
    const projects = (
      <ResizablePanels
        bkcolor="#fff"
        displayDirection="column"
        width="100%"
        height="100vh"
        panelsSize={[30, 30, 40]}
        sizeUnitMeasure="%"
        resizerColor="#000"
        resizerSize="3px"
      >
        <div
          style={{
            background: '#fff',
            height: '100%',
            width: '100%',
            display: 'flex'
          }}
        >
          <ProjectGroup
            title="Favorites"
            emptyMessage="You haven't marked any projects as a 'Favorite'"
            projects={this.props.projects.filter(p => p.favorite)}
          />
        </div>
        <div
          style={{
            background: '#fff',
            height: '100%',
            width: '100%',
            display: 'flex'
          }}
        >
          <ProjectGroup
            title="Recent"
            emptyMessage="No recent projects to display."
            projects={this.props.projects.filter(p => p.lastAccessed)}
          />
        </div>
        <div
          style={{
            background: '#fff',
            height: '100%',
            width: '100%',
            display: 'flex'
          }}
        >
          <ProjectGroup
            title="By Category"
            emptyMessage="You don't have any projects assigned to a category."
            projects={this.props.projects}
          />
        </div>
      </ResizablePanels>
    );

    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.titleContainer}>
          <div className={styles.title}>Projects</div>
          <IconButton color="inherit">
            <AddCircle />
          </IconButton>
          <IconButton color="inherit" onClick={this.props.onRefresh}>
            <RefreshIcon />
          </IconButton>
        </div>
        {projects}
      </div>
    );
  }
}
