import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import Messages from '../../constants/messages';
import People from '../../components/People/People';
import SettingsContext from '../../contexts/Settings';
import styles from './ConfigurationPage.css';

class ConfigurationPage extends Component {
  constructor(props) {
    super(props);
    this.handleDeletePerson = this.handleDeletePerson.bind(this);
  }

  handleDeletePerson = id => {
    ipcRenderer.send(Messages.REMOVE_DIRECTORY_PERSON_REQUEST, { id });
  };

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h1>Configuration</h1>
        <h2>My Directory</h2>
        <div className={styles.informational}>
          The people that I have added to different projects. These are saved here for easy addition
          to other projects in the future.
        </div>
        <People mode="directory" onDelete={this.handleDeletePerson} list={this.context.directory} />
      </div>
    );
  }
}

ConfigurationPage.contextType = SettingsContext;

export default ConfigurationPage;
