import React, { Component } from 'react';
import { Button } from '@material-ui/core';
import { remote } from 'electron';
import Error from '../../../components/Error/Error';
import styles from './ExistingDirectory.css';

class ExistingDirectory extends Component {
  constructor(props) {
    super(props);
    this.handleBrowseDirectory = this.handleBrowseDirectory.bind(this);
    this.state = {
      validationErrorMessage: null
    };
  }

  handleBrowseDirectory = () => {
    remote.dialog
      .showOpenDialog({
        title: 'Select the root path of your project',
        properties: ['openDirectory']
      })
      .then(result => {
        if (!result.canceled && result.filePaths !== null && result.filePaths.length > 0) {
          this.props.onDirectoryChanged(result.filePaths[0]);
          this.setState({ validationErrorMessage: null });
        }
        return result;
      })
      .catch(err => {
        this.setState({
          validationErrorMessage: `There was an error accessing the project root folder: ${err}`
        });
      });
  };

  render() {
    let validation = null;
    if (this.state.validationErrorMessage) {
      validation = <Error>{this.state.validationErrorMessage}</Error>;
    }

    return (
      <div className={styles.container} data-tid="container">
        <fieldset>
          <legend>Project root directory:</legend>
          <input readOnly type="text" value={this.props.directory} />
          <Button
            className={styles.browse}
            onClick={this.handleBrowseDirectory}
            variant="contained"
          >
            Browse...
          </Button>
        </fieldset>
        {validation}
      </div>
    );
  }
}

export default ExistingDirectory;
