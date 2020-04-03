// @flow
import React, { Component } from 'react';
import { Link } from 'react-router-dom';
//import { AppBar, Toolbar, Typography, IconButton } from '@material-ui/core';
//import SettingsIcon from '@material-ui/icons/Settings';
import ResizablePanels from 'resizable-panels-react';
import Projects from '../Projects/Projects';
import Project from '../Project/Project';
import routes from '../../constants/routes.json';
import styles from './Home.css';

type Props = {};

export default class Home extends Component<Props> {
  props: Props;

  /* <AppBar position="static">
    <Toolbar>
      <Typography variant="h6" className={styles.title}>
        StatWrap
      </Typography>
      <section className={styles.rightToolbar}>
        <IconButton aria-label="settings">
          <SettingsIcon />
        </IconButton>
      </section>
    </Toolbar>
  </AppBar> */

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
