import React, { Component, useRef } from 'react';
import PropTypes from 'prop-types';
import Draggable from 'react-draggable';
import { Dialog, DialogActions, DialogTitle, Button, Paper } from '@mui/material';
import { ipcRenderer } from 'electron';
import Messages from '../../constants/messages';
import Constants from '../../constants/constants';
import Error from '../../components/Error/Error';
import UserContext from '../../contexts/User';
import styles from './UserProfileDialog.css';

function PaperComponent(props) {
  // Fix needed for React19: https://github.com/react-grid-layout/react-draggable/blob/master/CHANGELOG.md#440-may-12-2020
  const nodeRef = useRef(null);
  return (
    <Draggable nodeRef={nodeRef} handle="#user-profile-dialog-title" cancel={'[class*="MuiDialogContent-root"]'}>
      <Paper ref={nodeRef} {...props} />
    </Draggable>
  );
}

class UserProfileDialog extends Component {
  constructor(props) {
    super(props);
    const { id = null, name = null, affiliation = null } = props;
    this.state = {
      errorMessage: null,
      id: id ? id : Constants.UndefinedDefaults.USER,
      displayName: name ? name.display : '',
      firstName: name ? name.first : '',
      lastName: name ? name.last : '',
      affiliation: affiliation ? affiliation : '',
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSaveUserProfile = this.handleSaveUserProfile.bind(this);
    this.handleSaveUserProfileCompleted = this.handleSaveUserProfileCompleted.bind(this);
  }

  componentDidMount() {
    ipcRenderer.on(Messages.SAVE_USER_PROFILE_RESPONSE, this.handleSaveUserProfileCompleted);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(
      Messages.SAVE_USER_PROFILE_RESPONSE,
      this.handleSaveUserProfileCompleted,
    );
  }

  handleSaveUserProfileCompleted(sender, response) {
    if (response && !response.error) {
      if (this.props.onSave) {
        this.props.onSave(response.user);
      }
      this.props.onClose(true);
    } else {
      this.setState({ errorMessage: response.errorMessage });
    }
  }

  handleSaveUserProfile() {
    const user = {
      id: this.state.id,
      name: {
        first: this.state.firstName,
        last: this.state.lastName,
        display: this.state.displayName,
      },
      affiliation: this.state.affiliation,
    };
    ipcRenderer.send(Messages.SAVE_USER_PROFILE_REQUEST, user);
  }

  handleInputChange(event) {
    const { target } = event;
    const value = target.type === 'checkbox' ? target.checked : target.value;
    const { name } = target;

    this.setState({
      [name]: value,
    });
  }

  render() {
    const { onClose, open = false } = this.props;
    let error = null;
    if (this.state.errorMessage) {
      error = <Error style={{ marginTop: '15px' }}>{this.state.errorMessage}</Error>;
    }

    return (
      <Dialog
        onClose={onClose}
        aria-labelledby="user-profile-dialog-title"
        PaperComponent={PaperComponent}
        open={open}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle classes={{ root: styles.title }} id="user-profile-dialog-title">
          Edit Your Profile
        </DialogTitle>
        <form onSubmit={this.onSubmit}>
          <div className={styles.formBody}>
            <div className={styles.formRow}>
              <label className={styles.label}>Username:</label>
              <div className={styles.id}>
                {this.state.id}
                <span className={styles.usernameComment}>User you are currently logged in as</span>
              </div>
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Full Name:</label>
              <input
                type="text"
                id={styles.firstName}
                className={styles.input}
                name="firstName"
                placeholder="First"
                value={this.state.firstName}
                onChange={this.handleInputChange}
              />
              <input
                type="text"
                id={styles.lastName}
                className={styles.input}
                name="lastName"
                placeholder="Last"
                value={this.state.lastName}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Display Name:</label>
              <input
                className={styles.input}
                type="text"
                name="displayName"
                placeholder="The name to show in the app, log entries, etc."
                value={this.state.displayName}
                onChange={this.handleInputChange}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label}>Affiliation:</label>
              <input
                className={styles.input}
                type="text"
                name="affiliation"
                value={this.state.affiliation}
                onChange={this.handleInputChange}
              />
            </div>
          </div>
        </form>
        {error}
        <DialogActions>
          <Button color="primary" onClick={this.handleSaveUserProfile}>
            Save
          </Button>
          <Button color="primary" onClick={onClose}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
}

UserProfileDialog.propTypes = {
  id: PropTypes.string,
  name: PropTypes.object,
  affiliation: PropTypes.string,
  onClose: PropTypes.func.isRequired,
  open: PropTypes.bool,
  // Triggered on a successful save of the person
  onSave: PropTypes.func,
};

UserProfileDialog.contextType = UserContext;

export default UserProfileDialog;
