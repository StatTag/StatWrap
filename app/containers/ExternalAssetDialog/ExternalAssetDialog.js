import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@mui/material';
import Error from '../../components/Error/Error';
import GeneralUtil from '../../utils/general';
import UserContext from '../../contexts/User';
import styles from './ExternalAssetDialog.css';

function PaperComponent(props) {
  return (
    <Draggable handle="#external-asset-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

class ExternalAssetDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: null,
      uri: props.uri ? props.uri : null,
      name: props.name ? props.name : '',
      details: props.details ? props.details : '',
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
      details: this.state.details,
    };

    if (asset.name.trim() === '' || asset.uri.trim() === '') {
      this.setState({errorMessage: 'You must enter a resource name and URL'});
      return;
    }

    if (this.props.onSave) {
      this.props.onSave(asset);
    }
  }

  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({ [name]: value });
  }

  handleValidatePath(event) {
    const { target } = event;
    const value = target.value;
    this.setState({validPath: GeneralUtil.isValidResourceUrl(value)});
  }

  render() {
    let error = null;
    if (this.state.errorMessage) {
      error = <Error style={{ marginTop: '15px' }}>{this.state.errorMessage}</Error>;
    }

    let pathError = null;
    if (!this.state.validPath) {
      pathError = <div className={styles.pathError}>Please check that your URL is valid</div>
    }

    let dialogAction = (this.state.uri === null) ? 'Add' : 'Edit';

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
              <label className={styles.label}>*URL:</label>
              <input
                type="text"
                id={styles.path}
                className={styles.input}
                name="uri"
                placeholder="https://statwrap.org"
                value={this.state.uri}
                onChange={this.handleInputChange}
                onBlur={this.handleValidatePath}
              />
              {pathError}
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Details:</label>
              <textarea
                id={styles.details}
                name="details"
                rows="4"
                value={this.state.details}
                placeholder="About my external resource (optional)..."
                onChange={this.handleInputChange}
              />
            </div>
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
  name: PropTypes.string,
  details: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  // Triggered on a successful save
  onSave: PropTypes.func,
};

ExternalAssetDialog.defaultProps = {
  uri: null,
  name: null,
  details: null,
  open: false,
  onSave: null,
};

ExternalAssetDialog.contextType = UserContext;

export default ExternalAssetDialog;
