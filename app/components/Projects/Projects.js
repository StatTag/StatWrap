// @flow
import React, { Component } from 'react';
import ResizablePanels from 'resizable-panels-react';
import IconButton from '@material-ui/core/IconButton';
import AddCircle from '@material-ui/icons/AddCircle';
import ProjectGroup from './ProjectGroup/ProjectGroup';
import styles from './Projects.css';

type Props = {};

export default class Projects extends Component<Props> {
  props: Props;

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
        </div>
        {projects}
      </div>
    );
  }
}
