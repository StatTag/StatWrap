import React, { Component } from 'react';
import People from '../../components/People/People';
import SettingsContext from '../../contexts/Settings';
import styles from './ConfigurationPage.css';

class ConfigurationPage extends Component {
  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h1>Configuration</h1>
        <h2>My Directory</h2>
        <div className={styles.informational}>
          The people that I have added to different projects. These are saved here for easy addition
          to other projects in the future.
        </div>
        <People mode="directory" list={this.context.directory} />
      </div>
    );
  }
}

ConfigurationPage.contextType = SettingsContext;

export default ConfigurationPage;
