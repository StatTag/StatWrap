// @flow
import React, { Component, useState } from 'react';
import { Tabs, Tab } from '@material-ui/core';
import { withStyles } from '@material-ui/core/styles';
import styles from './Project.css';

type Props = {};

class Project extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.state = { selectedTab: 0 };
  }

  changeHandler = (event, id) => {
    this.setState({ selectedTab: id });
  };

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.title}>{this.props.name}</div>
        <Tabs
          indicatorColor="primary"
          textColor="secondary"
          aria-label="Project details"
          variant="scrollable"
          className={styles.tabs}
          value={this.state.selectedTab}
          onChange={this.changeHandler}
        >
          <Tab className={styles.tab} label="Project" />
          <Tab className={styles.tab} label="Assets" />
          <Tab className={styles.tab} label="Workflows" />
          <Tab className={styles.tab} label="Collaborators" />
          <Tab className={styles.tab} label="References" />
          <Tab className={styles.tab} label="Notifications" />
        </Tabs>
      </div>
    );
  }
}

export default withStyles(styles)(Project);
