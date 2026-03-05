import React, { Component, useRef } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@mui/material';
import { dialog } from '@electron/remote';
import Error from '../../components/Error/Error';
import Constants from '../../constants/constants';
import GeneralUtil from '../../utils/general';
import UserContext from '../../contexts/User';
import styles from './ExternalAssetDialog.css';

function PaperComponent(props) {
  // Fix needed for React19: https://github.com/react-grid-layout/react-draggable/blob/master/CHANGELOG.md#440-may-12-2020
  const nodeRef = useRef(null);
  return (
    <Draggable nodeRef={nodeRef} handle="#external-asset-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper ref={nodeRef} {...props} />
    </Draggable>
  );
}

class ExternalAssetDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: null,
      uri: props.uri ? props.uri : '',
      name: props.name ? props.name : '',
      type: props.type ? props.type : Constants.AssetType.URL,
      isNew: props.isNew ? props.isNew : true,
      validPath: true
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleValidatePath = this.handleValidatePath.bind(this);
  }

  handleSave() {
    const asset = {
      uri: this.state.uri,
      name: this.state.name,
      type: this.state.type
    };

    if (asset.name.trim() === '' || asset.uri.trim() === '') {
      this.setState({ errorMessage: 'You must enter a resource name and path/URL' });
      return;
    }

    if (this.props.onSave) {
      this.props.onSave(asset, this.state.isNew);
    }
  }

  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    if (name === 'type') {
      this.setState({ [name]: value, uri: '', validPath: true });
    } else {
      this.setState({ [name]: value });
    }
  }

  handleValidatePath(event) {
    const { target } = event;
    const value = target.value;
    if (this.state.type === Constants.AssetType.URL) {
      this.setState({ validPath: GeneralUtil.isValidResourceUrl(value) });
    } else {
      this.setState({ validPath: value.trim() !== '' });
    }
  }

  handleBrowse = () => {
    const properties = this.state.type === Constants.AssetType.DIRECTORY ? ['openDirectory'] : ['openFile'];
    dialog
      .showOpenDialog({
        title: 'Select an external resource',
        properties: properties,
      })
      .then((result) => {
        if (!result.canceled && result.filePaths !== null && result.filePaths.length > 0) {
          this.setState({ uri: result.filePaths[0], validPath: true });
        }
        return result;
      })
      .catch((err) => {
        console.error(err);
      });
  };

  render() {
    let error = null;
    if (this.state.errorMessage) {
      error = <Error style={{ marginTop: '15px' }}>{this.state.errorMessage}</Error>;
    }

    let pathError = null;
    if (!this.state.validPath) {
      pathError = <div className={styles.pathError}>Please check that your path/URL is valid</div>
    }

    let dialogAction = this.state.isNew ? 'Add' : 'Edit';

    return (
      <Dialog
        onClose={this.props.onClose}
        aria-labelledby="external-asset-dialog-title"
        PaperComponent={PaperComponent}
        open={this.props.open}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle classes={{ root: styles.title }} id="external-asset-dialog-title">
          {dialogAction} External Resource
        </DialogTitle>
        <form onSubmit={this.onSubmit}>
          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <label className={styles.label}>*Type:</label>
              <select
                className={styles.input}
                name="type"
                value={this.state.type}
                onChange={this.handleInputChange}
                style={{ height: '30px' }}
              >
                <option value={Constants.AssetType.URL}>URL</option>
                <option value={Constants.AssetType.DIRECTORY}>Folder</option>
                <option value={Constants.AssetType.FILE}>File</option>
              </select>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>*Name:</label>
              <input
                autoFocus
                type="text"
                id={styles.name}
                className={styles.input}
                name="name"
                placeholder="My external resource"
                value={this.state.name}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>{this.state.type === Constants.AssetType.URL ? '*URL:' : '*Path:'}</label>
              <div style={{ display: 'flex', flex: 1, gap: '10px' }}>
                <input
                  type="text"
                  id={styles.path}
                  className={styles.input}
                  name="uri"
                  placeholder={this.state.type === Constants.AssetType.URL ? "https://statwrap.org" : "Path to resource"}
                  value={this.state.uri}
                  onChange={this.handleInputChange}
                  onBlur={this.handleValidatePath}
                />
                {this.state.type !== Constants.AssetType.URL && (
                  <Button variant="contained" onClick={this.handleBrowse} style={{ whiteSpace: 'nowrap' }}>
                    Browse...
                  </Button>
                )}
              </div>
            </div>
            {pathError}
          </div>
        </form>
        {error}
        <DialogActions>
          <Button color="primary" onClick={this.handleSave}>
            Save
          </Button>
          <Button color="primary" onClick={this.props.onClose}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

ExternalAssetDialog.propTypes = {
  uri: PropTypes.string,
  type: PropTypes.string,
  name: PropTypes.string,
  isNew: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  // Triggered on a successful save
  onSave: PropTypes.func,
};

ExternalAssetDialog.defaultProps = {
  uri: null,
  type: Constants.AssetType.URL,
  name: null,
  isNew: true,
  open: false,
  onSave: null,
};

ExternalAssetDialog.contextType = UserContext;

export default ExternalAssetDialog;
