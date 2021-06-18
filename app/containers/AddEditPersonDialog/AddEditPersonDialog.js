/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/forbid-prop-types */
/* eslint-disable object-shorthand */
/* eslint-disable react/jsx-props-no-spreading */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@material-ui/core';
import { ipcRenderer } from 'electron';
import Messages from '../../constants/messages';
import Error from '../../components/Error/Error';
import TagEditor from '../../components/TagEditor/TagEditor';
import UserContext from '../../contexts/User';
import styles from './AddEditPersonDialog.css';

function PaperComponent(props) {
  return (
    <Draggable handle="#person-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

class AddEditPersonDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: null,
      id: props.id ? props.id : '',
      firstName: props.name ? props.name.first : '',
      middleName: props.name ? props.name.middle : '',
      lastName: props.name ? props.name.last : '',
      prefixName: props.name ? props.name.prefix : '',
      suffixName: props.name ? props.name.suffix : '',
      email: props.email ? props.email : '',
      affiliation: props.affiliation ? props.affiliation : '',
      roles: props.roles ? props.roles : []
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleCreateUpdatePerson = this.handleCreateUpdatePerson.bind(this);
    this.handleCreateUpdatePersonCompleted = this.handleCreateUpdatePersonCompleted.bind(this);
  }

  // static getDerivedStateFromProps(props, currentState) {
  //   console.log('getDerivedStateFromProps');
  //   if (currentState.email !== props.email) {
  //     return {
  //       id: props.id ? props.id : '',
  //       firstName: props.name ? props.name.first : '',
  //       middleName: props.name ? props.name.middle : '',
  //       lastName: props.name ? props.name.last : '',
  //       prefixName: props.name ? props.name.prefix : '',
  //       suffixName: props.name ? props.name.suffix : '',
  //       email: props.email ? props.email : '',
  //       affiliation: props.affiliation ? props.affiliation : '',
  //       roles: props.roles ? props.roles : []
  //     };
  //   }
  //   return null;
  // }

  componentDidMount() {
    ipcRenderer.on(Messages.CREATE_UPDATE_PERSON_RESPONSE, this.handleCreateUpdatePersonCompleted);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(
      Messages.CREATE_UPDATE_PERSON_RESPONSE,
      this.handleCreateUpdatePersonCompleted
    );
  }

  handleCreateUpdatePersonCompleted(sender, response) {
    console.log(response);
    if (response && !response.error) {
      if (this.props.onSaved) {
        this.props.onSaved(this.state.id);
      }
      // ipcRenderer.send(
      //   Messages.WRITE_PROJECT_LOG_REQUEST,
      //   response.project.path,
      //   Constants.ActionType.PROJECT_CREATED,
      //   Constants.ActionType.PROJECT_CREATED,
      //   `${this.context} created person ${response.person.name}`,
      //   response.person,
      //   'info',
      //   this.context
      // );
      this.props.onClose(true);
    } else {
      this.setState({ errorMessage: response.errorMessage });
    }
  }

  handleCreateUpdatePerson() {
    ipcRenderer.send(Messages.CREATE_UPDATE_PERSON_REQUEST, this.props.mode, this.props.project, {
      id: this.state.id,
      name: {
        first: this.state.firstName,
        middle: this.state.middleName,
        last: this.state.lastName,
        prefix: this.state.prefixName,
        suffix: this.state.suffixName
      },
      email: this.state.email,
      affiliation: this.state.affiliation,
      roles: this.state.roles
    });
  }

  handleRolesChanged(changedRoles) {
    console.log(changedRoles);
    this.setState({ roles: changedRoles });
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
    const dialogTitle = this.props.id ? 'Edit Person' : 'Add Person';
    let error = null;
    if (this.state.errorMessage) {
      error = <Error style={{ marginTop: '15px' }}>{this.state.errorMessage}</Error>;
    }
    let roles = null;
    if (this.props.mode.toLowerCase() === 'project') {
      roles = (
        <div className={styles.formRow}>
          <label>Roles:</label>
          <TagEditor tags={this.state.roles} onChange={this.handleRolesChanged} />
        </div>
      );
    }

    return (
      <Dialog
        onClose={this.props.onClose}
        aria-labelledby="person-dialog-title"
        PaperComponent={PaperComponent}
        open={this.props.open}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle classes={{ root: styles.title }} id="person-dialog-title">
          {dialogTitle}
        </DialogTitle>
        <form onSubmit={this.onSubmit}>
          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <label>Name:</label>
              <input
                type="text"
                id={styles.prefixName}
                name="prefixName"
                placeholder="Dr."
                value={this.state.prefixName}
                onChange={this.handleInputChange}
              />
              <input
                type="text"
                id={styles.firstName}
                name="firstName"
                placeholder="First"
                value={this.state.firstName}
                onChange={this.handleInputChange}
              />
              <input
                type="text"
                id={styles.middleName}
                name="middleName"
                placeholder="M"
                value={this.state.middleName}
                onChange={this.handleInputChange}
              />
              <input
                type="text"
                id={styles.lastName}
                name="lastName"
                placeholder="Last"
                value={this.state.lastName}
                onChange={this.handleInputChange}
              />
              <input
                type="text"
                id={styles.suffixName}
                name="suffixName"
                placeholder="Jr."
                value={this.state.suffixName}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label>E-mail:</label>
              <input
                type="text"
                name="email"
                placeholder="person@email.com"
                value={this.state.email}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label>Affiliation:</label>
              <input
                type="text"
                name="affiliation"
                value={this.state.affiliation}
                onChange={this.handleInputChange}
              />
            </div>
            {roles}
          </div>
        </form>
        {error}
        <DialogActions>
          <Button color="primary" onClick={this.handleCreateUpdatePerson}>
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

AddEditPersonDialog.propTypes = {
  project: PropTypes.object,
  mode: PropTypes.string.isRequired,
  id: PropTypes.string,
  name: PropTypes.object,
  email: PropTypes.string,
  affiliation: PropTypes.string,
  roles: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  // Triggered on a successful save of the person
  onSaved: PropTypes.func
};

AddEditPersonDialog.defaultProps = {
  id: null,
  name: null,
  email: null,
  affiliation: null,
  roles: [],
  open: false,
  onSaved: null
};

AddEditPersonDialog.contextType = UserContext;

export default AddEditPersonDialog;
