// @flow
import React, { Component } from 'react';
import ResizablePanels from 'resizable-panels-react';
import ProjectList from './ProjectList/ProjectList';
import styles from './Projects.css';

type Props = {};

export default class Projects extends Component<Props> {
  props: Props;

  render() {
    const projects = (<ResizablePanels
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
        display: 'flex',
      }}
    >
      <ProjectList title="Favorites" />
    </div>
    <div
      style={{
        background: '#fff',
        height: '100%',
        width: '100%',
        display: 'flex',
      }}
    >
      <ProjectList title="Recent" />
    </div>
    <div
      style={{
        background: '#fff',
        height: '100%',
        width: '100%',
        display: 'flex',
      }}
    >
    <ProjectList title="By Category" />
  </div>
  </ResizablePanels>);

    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.title}>Projects</div>
        {projects}
      </div>
    );
  }
}
