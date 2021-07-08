import React, { Component } from 'react';
import SettingsContext from '../../contexts/Settings';
import styles from './ConfigurationPage.css';

class ConfigurationPage extends Component {
  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h1>Configuration</h1>
      </div>
    );
  }
}

ConfigurationPage.contextType = SettingsContext;

export default ConfigurationPage;
