// @flow
import React, { Component } from 'react';
import ResizablePanels from 'resizable-panels-react';
import Projects from '../../components/Projects/Projects';
import Project from '../../components/Project/Project';
import styles from './ProjectPage.css';

type Props = {};

export default class ProjectPage extends Component<Props> {
  props: Props;

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <ResizablePanels
          bkcolor="#fff"
          displayDirection="row"
          width="100%"
          height="100vh"
          panelsSize={[30, 70]}
          sizeUnitMeasure="%"
          resizerColor="#000"
          resizerSize="5px"
        >
          <div
            style={{
              background: '#fff',
              height: '100%',
              width: '100%',
              display: 'flex'
            }}
          >
            <Projects />
          </div>
          <div style={{ background: '#fff', height: '100%', width: '100%' }}>
            <Project name="My Amazing Project" />
          </div>
        </ResizablePanels>
      </div>
    );
  }
}
