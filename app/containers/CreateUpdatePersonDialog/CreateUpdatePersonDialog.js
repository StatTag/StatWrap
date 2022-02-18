/* eslint-disable no-nested-ternary */
/* eslint-disable jsx-a11y/no-autofocus */
/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/forbid-prop-types */
/* eslint-disable object-shorthand */
/* eslint-disable react/jsx-props-no-spreading */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper, TextField } from '@mui/material';
import Autocomplete from '@mui/lab/Autocomplete';
import { ipcRenderer } from 'electron';
import Messages from '../../constants/messages';
import GeneralUtil from '../../utils/general';
import Error from '../../components/Error/Error';
import TagEditor from '../../components/TagEditor/TagEditor';
import UserContext from '../../contexts/User';
import styles from './CreateUpdatePersonDialog.css';

function PaperComponent(props) {
  return (
    <Draggable handle="#person-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper {...props} />
    </Draggable>
  );
}

class CreateUpdatePersonDialog extends Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: null,
      id: props.id ? props.id : '',
      firstName: props.name ? props.name.first : '',
      lastName: props.name ? props.name.last : '',
      affiliation: props.affiliation ? props.affiliation : '',
      roles: props.roles ? props.roles : []
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleRolesChanged = this.handleRolesChanged.bind(this);
    this.handleCreateUpdatePerson = this.handleCreateUpdatePerson.bind(this);
    this.handleCreateUpdatePersonCompleted = this.handleCreateUpdatePersonCompleted.bind(this);
    this.handleSelectPersonInDirectory = this.handleSelectPersonInDirectory.bind(this);
  }

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
    if (response && !response.error) {
      if (this.props.onSave) {
        this.props.onSave(response.person);
      }
      this.props.onClose(true);
    } else {
      this.setState({ errorMessage: response.errorMessage });
    }
  }

  savePerson(person) {
    ipcRenderer.send(
      Messages.CREATE_UPDATE_PERSON_REQUEST,
      this.props.mode,
      this.props.project,
      person
    );
  }

  handleCreateUpdatePerson() {
    const person = {
      id: this.state.id,
      name: {
        first: this.state.firstName,
        last: this.state.lastName
      },
      affiliation: this.state.affiliation,
      roles: this.state.roles
    };
    this.savePerson(person);
  }

  handleRolesChanged(changedRoles) {
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

  handleSelectPersonInDirectory(event, value) {
    // If the user clears out the dropdown list, we will get a null object back here.
    // In that case, we will actually preserve whatever is entered in the dialog
    // already, so no state update takes place.  We will only do the change when they
    // actually select a person from the list.
    if (value) {
      this.setState(prevState => ({
        ...prevState,
        id: value.id,
        firstName: value.name.first,
        lastName: value.name.last,
        affiliation: value.affiliation
      }));
    }
  }

  render() {
    const dialogTitle = this.props.id ? 'Edit Person' : 'Add Person';
    let error = null;
    if (this.state.errorMessage) {
      error = <Error style={{ marginTop: '15px' }}>{this.state.errorMessage}</Error>;
    }
    const projectMode = this.props.mode.toLowerCase() === 'project';
    let roles = null;
    if (projectMode) {
      roles = (
        <div className={styles.formRow}>
          <label className={styles.personLabel}>Roles:</label>
          <TagEditor tags={this.state.roles} onChange={this.handleRolesChanged} />
        </div>
      );
    }

    // We only want to show the user directory and allow selection from it if:
    //  - We are invoking this dialog for a project
    //  - The user has a directory populated
    //  - We are in create mode (not edit mode)
    let directory = null;
    if (projectMode && this.props.directory && this.props.directory.length > 0 && !this.props.id) {
      // Sort the directory so that the most recently added person in the MRU list/directory
      // appears at the top.  Note that we are making a copy of the array because we are going
      // to (possibly) add an item to it.  We don't want to update the original array with
      // that value if we do add it.
      const sortedDirectory = [...this.props.directory].sort((a, b) =>
        a.added > b.added ? -1 : b.added > a.added ? 1 : 0
      );

      // If there is the user's information, push that to the top of the directory
      // as the first entry, and indicate that it is the user.
      if (this.props.user && this.props.user.name && this.props.user.name.display) {
        const user = { ...this.props.user, userEntry: true };
        sortedDirectory.unshift(user);
      }

      directory = (
        <div className={styles.directoryPanel}>
          <Autocomplete
            id="user-directory"
            options={sortedDirectory}
            onChange={this.handleSelectPersonInDirectory}
            getOptionLabel={option =>
              option.userEntry
                ? `${GeneralUtil.formatName(option.name)} (me)`
                : GeneralUtil.formatName(option.name)
            }
            renderInput={params => (
              <TextField {...params} label="Select a recently added person" variant="outlined" />
            )}
          />
          <div className={styles.separator}> &ndash; or enter a new person &ndash; </div>
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
          {directory}
          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <label className={styles.personLabel}>Name:</label>
              <input
                className={styles.personInput}
                type="text"
                id={styles.firstName}
                name="firstName"
                placeholder="First"
                value={this.state.firstName}
                onChange={this.handleInputChange}
              />
              <input
                className={styles.personInput}
                type="text"
                id={styles.lastName}
                name="lastName"
                placeholder="Last"
                value={this.state.lastName}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.personLabel}>Affiliation:</label>
              <input
                className={styles.personInput}
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

CreateUpdatePersonDialog.propTypes = {
  project: PropTypes.object,
  mode: PropTypes.string.isRequired,
  directory: PropTypes.array,
  user: PropTypes.object,
  id: PropTypes.string,
  name: PropTypes.object,
  affiliation: PropTypes.string,
  roles: PropTypes.array,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  // Triggered on a successful save of the person
  onSave: PropTypes.func
};

CreateUpdatePersonDialog.defaultProps = {
  project: null,
  directory: [],
  user: null,
  id: null,
  name: null,
  affiliation: null,
  roles: [],
  open: false,
  onSave: null
};

CreateUpdatePersonDialog.contextType = UserContext;

export default CreateUpdatePersonDialog;
