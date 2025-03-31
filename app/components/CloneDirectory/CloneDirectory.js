import React, { Component } from 'react';
import { Button } from '@mui/material';
import { dialog } from '@electron/remote';
import PropTypes from 'prop-types';
import Error from '../Error/Error';
import ConfigFileInfo from '../ConfigFileInfo/ConfigFileInfo';
import styles from './CloneDirectory.css';

class CloneDirectory extends Component {
  constructor(props) {
    super(props);
    this.handleBrowseSourceDirectory = this.handleBrowseSourceDirectory.bind(this);
    this.handleBrowseTargetBaseDirectory = this.handleBrowseTargetBaseDirectory.bind(this);
    this.handleProjectNameChange = this.handleProjectNameChange.bind(this);
    this.state = {
      validationErrorMessage: null,
    };
  }

  handleBrowseSourceDirectory = () => {
    dialog
      .showOpenDialog({
        title: 'Select the source project directory to clone from',
        properties: ['openDirectory'],
      })
      .then((result) => {
        if (!result.canceled && result.filePaths !== null && result.filePaths.length > 0) {
          this.props.onSourceDirectoryChanged(result.filePaths[0]);
          this.setState({ validationErrorMessage: null });
        }
        return result;
      })
      .catch((err) => {
        this.setState({
          validationErrorMessage: `There was an error accessing the source project directory: ${err}`,
        });
      });
  };

  handleBrowseTargetBaseDirectory = () => {
    dialog
      .showOpenDialog({
        title: 'Select the base directory where the new project will be created',
        properties: ['openDirectory'],
      })
      .then((result) => {
        if (!result.canceled && result.filePaths !== null && result.filePaths.length > 0) {
          this.props.onTargetBaseDirectoryChanged(result.filePaths[0]);
          this.setState({ validationErrorMessage: null });
        }
        return result;
      })
      .catch((err) => {
        this.setState({
          validationErrorMessage: `There was an error accessing the target base directory: ${err}`,
        });
      });
  };

  handleProjectNameChange = (event) => {
    this.props.onProjectNameChanged(event.target.value);
  };

  render() {
    let validation = null;
    if (this.state.validationErrorMessage) {
      validation = <Error style={{ marginTop: '15px' }}>{this.state.validationErrorMessage}</Error>;
    }

    const targetDirectory = this.props.targetBaseDirectory && this.props.projectName
      ? `${this.props.targetBaseDirectory}/${this.props.projectName}`
      : '';

    return (
      <div className={styles.container} data-tid="container">
        <fieldset>
          <legend>Source project directory to clone:</legend>
          <input readOnly type="text" value={this.props.sourceDirectory} />
          <Button
            className={styles.browse}
            onClick={this.handleBrowseSourceDirectory}
            variant="contained"
          >
            Browse...
          </Button>
        </fieldset>

        <fieldset>
          <legend>Target base directory:</legend>
          <input readOnly type="text" value={this.props.targetBaseDirectory} />
          <Button
            className={styles.browse}
            onClick={this.handleBrowseTargetBaseDirectory}
            variant="contained"
          >
            Browse...
          </Button>
        </fieldset>

        <fieldset>
          <legend>New project name:</legend>
          <input
            type="text"
            value={this.props.projectName}
            onChange={this.handleProjectNameChange}
          />
        </fieldset>

        {targetDirectory && (
          <div className={styles.targetDirectoryPreview}>
            <p>New project will be created at:</p>
            <code>{targetDirectory}</code>
          </div>
        )}

        <ConfigFileInfo />
        {validation}
      </div>
    );
  }
}

CloneDirectory.propTypes = {
  sourceDirectory: PropTypes.string.isRequired,
  targetBaseDirectory: PropTypes.string.isRequired,
  projectName: PropTypes.string.isRequired,
  onSourceDirectoryChanged: PropTypes.func.isRequired,
  onTargetBaseDirectoryChanged: PropTypes.func.isRequired,
  onProjectNameChanged: PropTypes.func.isRequired,
};

export default CloneDirectory;
