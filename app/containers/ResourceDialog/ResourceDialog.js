import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@mui/material';
import Error from '../../components/Error/Error';
import GeneralUtil from '../../utils/general';
import UserContext from '../../contexts/User';
import styles from './ResourceDialog.css';

function PaperComponent(props) {
  return (
    <Draggable handle="#resource-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

class ResourceDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: null,
      id: props.id ? props.id : null,
      name: props.name ? props.name : '',
      details: props.details ? props.details : '',
      path: props.path ? props.path : '',
      validPath: true
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSave = this.handleSave.bind(this);
    this.handleValidatePath = this.handleValidatePath.bind(this);
  }

  handleSave() {
    const group = {
      id: this.state.id,
      name: this.state.name,
      details: this.state.details,
      path: this.state.path,
    };

    if (this.props.onSave) {
      this.props.onSave(group);
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

    let dialogAction = (this.state.id === null) ? 'Add' : 'Edit';

    return (
      <Dialog
        onClose={this.props.onClose}
        aria-labelledby="resource-dialog-title"
        PaperComponent={PaperComponent}
        open={this.props.open}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle classes={{ root: styles.title }} id="resource-dialog-title">
          {dialogAction} Project Resource
        </DialogTitle>
        <form onSubmit={this.onSubmit}>
          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <label className={styles.label}>Name:</label>
              <input
                autoFocus
                type="text"
                id={styles.name}
                className={styles.input}
                name="name"
                placeholder="My Resource"
                value={this.state.name}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>URL:</label>
              <input
                type="text"
                id={styles.path}
                className={styles.input}
                name="path"
                placeholder="https://statwrap.org"
                value={this.state.url}
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
                placeholder="About my resource..."
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

ResourceDialog.propTypes = {
  id: PropTypes.string,
  name: PropTypes.string,
  details: PropTypes.string,
  path: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  // Triggered on a successful save
  onSave: PropTypes.func,
};

ResourceDialog.defaultProps = {
  id: null,
  name: null,
  details: null,
  path: null,
  open: false,
  onSave: null,
};

ResourceDialog.contextType = UserContext;

export default ResourceDialog;
