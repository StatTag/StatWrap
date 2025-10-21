import * as React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { AppBar, Toolbar, IconButton } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import SearchIcon from '@mui/icons-material/Search';
import HomeIcon from '@mui/icons-material/Home';
import AboutIcon from '@mui/icons-material/Info';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faFolder,
  faTag,
  faThumbtack,
  faEllipsisH,
  faTrashAlt,
  faHome,
  faUser,
  faTh,
  faThList,
  faBell,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import Messages from '../constants/messages';
import routes from '../constants/routes.json';
import UserContext from '../contexts/User';
import SettingsContext from '../contexts/Settings';
import UserProfileDialog from './UserProfileDialog/UserProfileDialog';
import styles from './App.css';
import GeneralUtil from '../utils/general';

// This is where we register all of our font-awesome icons that are used throughout the app.
// See https://github.com/FortAwesome/react-fontawesome#build-a-library-to-reference-icons-throughout-your-app-more-conveniently
library.add(
  faFolder,
  faTag,
  faThumbtack,
  faEllipsisH,
  faTrashAlt,
  faHome,
  faUser,
  faTh,
  faThList,
  faBell,
  faTimes,
);

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: 'StatWrap',
      displayName: 'StatWrap',
      settings: {},
      displayUserProfileDialog: false,
      userProfileDialogKey: 0,
    };

    this.handleLoadUserInfoResponse = this.handleLoadUserInfoResponse.bind(this);
    this.handleUpdateSearchSettingsResponse = this.handleUpdateSearchSettingsResponse.bind(this);
    this.handlePersonDirectoryChangeResponse = this.handlePersonDirectoryChangeResponse.bind(this);
    this.handleCloseUserProfileDialog = this.handleCloseUserProfileDialog.bind(this);
    this.handleOpenUserProfileDialog = this.handleOpenUserProfileDialog.bind(this);
    this.handleSaveUserProfile = this.handleSaveUserProfile.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_USER_INFO_REQUEST);
    ipcRenderer.on(Messages.LOAD_USER_INFO_RESPONSE, this.handleLoadUserInfoResponse);
    ipcRenderer.on(Messages.SEARCH_UPDATE_SETTINGS_RESPONSE, this.handleUpdateSearchSettingsResponse);
    ipcRenderer.on(
      Messages.CREATE_UPDATE_PERSON_RESPONSE,
      this.handlePersonDirectoryChangeResponse,
    );
    ipcRenderer.on(
      Messages.REMOVE_DIRECTORY_PERSON_RESPONSE,
      this.handlePersonDirectoryChangeResponse,
    );
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(Messages.LOAD_USER_INFO_RESPONSE, this.handleLoadUserInfoResponse);
    ipcRenderer.removeListener(Messages.SEARCH_UPDATE_SETTINGS_RESPONSE, this.handleUpdateSearchSettingsResponse);
    ipcRenderer.removeListener(
      Messages.CREATE_UPDATE_PERSON_RESPONSE,
      this.handlePersonDirectoryChangeResponse,
    );
    ipcRenderer.removeListener(
      Messages.REMOVE_DIRECTORY_PERSON_RESPONSE,
      this.handlePersonDirectoryChangeResponse,
    );
  }

  handleLoadUserInfoResponse(sender, response) {
    const firstTimeRun = !response.settings || !response.settings.user;
    this.setState((prevState) => ({
      user: response.user,
      displayName: GeneralUtil.formatDisplayName(response.settings.user),
      settings: response.settings,
      userProfileDialogKey: prevState + 1,
      displayUserProfileDialog: firstTimeRun,
    }));
  }

  handleUpdateSearchSettingsResponse(sender, response) {
    this.setState((prevState) => ({
      settings: {...prevState.settings, searchSettings: response.searchSettings }
    }));
  }

  handlePersonDirectoryChangeResponse() {
    // Reload the settings to reflect the updated directory
    ipcRenderer.send(Messages.LOAD_USER_INFO_REQUEST);
  }

  handleSaveUserProfile(user) {
    this.setState((prevState) => ({
      displayName: GeneralUtil.formatDisplayName(user),
      // Update the user portion of the settings object
      settings: { ...prevState.settings, user },
    }));
  }

  handleCloseUserProfileDialog() {
    this.setState({ displayUserProfileDialog: false });
  }

  handleOpenUserProfileDialog() {
    this.setState({ displayUserProfileDialog: true });
  }

  render() {
    const { children } = this.props;
    const theme = createTheme({
      palette: {
        type: 'light',
        primary: {
          main: '#222222',
        },
        secondary: {
          main: '#f50057',
        },
      },
    });
    // const theme = createTheme(
    //   adaptV4Theme({
    //     palette: {
    //       type: 'light'
    //     },
    //     typography: {
    //       fontSize: 12
    //     }
    //   })
    // );
    let userProfileDialog = null;
    if (this.state.settings && this.state.settings.user) {
      userProfileDialog = (
        <UserProfileDialog
          key={this.state.userProfileDialogKey}
          id={this.state.settings.user.id}
          name={this.state.settings.user.name}
          affiliation={this.state.settings.user.affiliation}
          open={this.state.displayUserProfileDialog}
          onClose={this.handleCloseUserProfileDialog}
          onSave={this.handleSaveUserProfile}
        />
      );
    } else {
      userProfileDialog = (
        <UserProfileDialog
          key={this.state.userProfileDialogKey}
          id={this.state.user}
          open={this.state.displayUserProfileDialog}
          onClose={this.handleCloseUserProfileDialog}
          onSave={this.handleSaveUserProfile}
        />
      );
    }
    return (
      <ThemeProvider theme={theme}>
        <UserContext.Provider value={this.state.user}>
          <SettingsContext.Provider value={this.state.settings}>
            <AppBar position="static">
              <Toolbar className={styles.toolbar}>
                <img alt="StatWrap logo" src="images/banner.png" />
                <section className={styles.rightToolbar}>
                  <Link to={routes.HOME} className={styles.navigation}>
                    <IconButton aria-label="home">
                      <HomeIcon />
                    </IconButton>
                  </Link>
                  <Link to={routes.SEARCH} className={styles.navigation}>
                    <IconButton aria-label="search">
                      <SearchIcon />
                    </IconButton>
                  </Link>
                  <Link to={routes.CONFIGURATION} className={styles.navigation}>
                    <IconButton aria-label="settings">
                      <SettingsIcon />
                    </IconButton>
                  </Link>
                  <Link to={routes.ABOUT} className={styles.navigation}>
                    <IconButton aria-label="settings">
                      <AboutIcon />
                    </IconButton>
                  </Link>
                  <div className={styles.user}>
                    <a className={styles.userButton} onClick={this.handleOpenUserProfileDialog}>
                      {this.state.displayName}
                    </a>
                  </div>
                </section>
              </Toolbar>
            </AppBar>
            {children}
            {userProfileDialog}
          </SettingsContext.Provider>
        </UserContext.Provider>
      </ThemeProvider>
    );
  }
}
