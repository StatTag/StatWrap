import React, { Component, useContext } from 'react';
import { ipcRenderer } from 'electron';
import Messages from '../../constants/messages';
import SearchSettings from '../../components/Search/SearchSettings/SearchSettings';
import styles from './ConfigurationPage.css';

class ConfigurationPage extends Component {
  constructor(props) {
    super(props);
    this.state = {
      projects: [],
      // UI state flag to let us know if the list of projects has been loaded or not
      loaded: false
    };

    this.handleLoadProjectListResponse = this.handleLoadProjectListResponse.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_PROJECT_LIST_REQUEST);
    ipcRenderer.on(Messages.LOAD_PROJECT_LIST_RESPONSE, this.handleLoadProjectListResponse);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(
      Messages.LOAD_PROJECT_LIST_RESPONSE,
      this.handleLoadProjectListResponse,
    );
  }

  handleLoadProjectListResponse(sender, response) {
    // This allows us to update the list of projects within the state.  We do this here
    // to control how often the call is made to load the project list, since this component
    // does not have cause to re-render as often as its children do.
    this.setState({ ...response, loaded: true });
  }

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h1>Configuration</h1>
        <SearchSettings projects={this.state.loaded ? this.state.projects : null} />
      </div>
    );
  }
}

export default ConfigurationPage;
