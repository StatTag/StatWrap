/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable react/forbid-prop-types */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@mui/material';
import Error from '../../components/Error/Error';
import UserContext from '../../contexts/User';
import styles from './AssetGroupDialog.css';

function PaperComponent(props) {
  return (
    <Draggable handle="#asset-group-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

class AssetGroupDialog extends Component {
  constructor(props) {
    super(props);
    console.log(props);
    this.state = {
      errorMessage: null,
      id: props.id ? props.id : null,
      name: props.name ? props.name : '',
      details: props.details ? props.details : '',
      assets: props.assets ? props.assets : []
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSaveAssetGroup = this.handleSaveAssetGroup.bind(this);
  }

  handleSaveAssetGroup() {
    const group = {
      id: this.state.id,
      name: this.state.name,
      details: this.state.details,
      assets: this.state.assets
    };

    if (this.props.onSave) {
      this.props.onSave(group);
    }
  }

  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value
    });
  }

  render() {
    let error = null;
    if (this.state.errorMessage) {
      error = <Error style={{ marginTop: '15px' }}>{this.state.errorMessage}</Error>;
    }

    return (
      <Dialog
        onClose={this.props.onClose}
        aria-labelledby="asset-group-dialog-title"
        PaperComponent={PaperComponent}
        open={this.props.open}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle classes={{ root: styles.title }} id="asset-group-dialog-title">
          Save Asset Group
        </DialogTitle>
        <form onSubmit={this.onSubmit}>
          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <label className={styles.label}>Group Name:</label>
              <input
                autoFocus
                type="text"
                id={styles.name}
                className={styles.input}
                name="name"
                placeholder="My Group"
                value={this.state.name}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Details:</label>
              <textarea
                id={styles.details}
                name="details"
                rows="4"
                value={this.state.details}
                placeholder="About my asset group..."
                onChange={this.handleInputChange}
              />
            </div>
          </div>
        </form>
        {error}
        <DialogActions>
          <Button color="primary" onClick={this.handleSaveAssetGroup}>
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

AssetGroupDialog.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  details: PropTypes.string,
  assets: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  // Triggered on a successful save of the group
  onSave: PropTypes.func
};

AssetGroupDialog.defaultProps = {
  id: null,
  name: null,
  details: null,
  assets: null,
  open: false,
  onSave: null
};

AssetGroupDialog.contextType = UserContext;

export default AssetGroupDialog;
