/* eslint-disable react/prop-types */
import * as React from 'react';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { AppBar, Toolbar, Typography, IconButton } from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';
import SearchIcon from '@material-ui/icons/Search';
import HomeIcon from '@material-ui/icons/Home';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faFolder,
  faTag,
  faThumbtack,
  faEllipsisH,
  faTrashAlt,
  faHome,
  faUser
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { ipcRenderer } from 'electron';
import Messages from '../constants/messages';
import routes from '../constants/routes.json';
import UserContext from '../contexts/User';
import SettingsContext from '../contexts/Settings';
import styles from './App.css';

// This is where we register all of our font-awesome icons that are used throughout the app.
// See https://github.com/FortAwesome/react-fontawesome#build-a-library-to-reference-icons-throughout-your-app-more-conveniently
library.add(faFolder, faTag, faThumbtack, faEllipsisH, faTrashAlt, faHome, faUser);

export default class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = { user: 'StatWrap' };

    this.handleLoadUserInfoResponse = this.handleLoadUserInfoResponse.bind(this);
    this.handleCreateUpdatePersonResponse = this.handleCreateUpdatePersonResponse.bind(this);
  }

  componentDidMount() {
    ipcRenderer.send(Messages.LOAD_USER_INFO_REQUEST);
    ipcRenderer.on(Messages.LOAD_USER_INFO_RESPONSE, this.handleLoadUserInfoResponse);
    ipcRenderer.on(Messages.CREATE_UPDATE_PERSON_RESPONSE, this.handleCreateUpdatePersonResponse);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(Messages.LOAD_USER_INFO_RESPONSE, this.handleLoadUserInfoResponse);
    ipcRenderer.removeListener(
      Messages.CREATE_UPDATE_PERSON_RESPONSE,
      this.handleCreateUpdatePersonResponse
    );
  }

  handleLoadUserInfoResponse(sender, response) {
    this.setState({ user: response.user, settings: response.settings });
  }

  handleCreateUpdatePersonResponse() {
    // Reload the settings to reflect the updated directory
    ipcRenderer.send(Messages.LOAD_USER_INFO_REQUEST);
  }

  render() {
    const { children } = this.props;
    const theme = createMuiTheme({
      palette: {
        type: 'light'
      },
      typography: {
        fontSize: 12
      }
    });
    return (
      <ThemeProvider theme={theme}>
        <UserContext.Provider value={this.state.user}>
          <SettingsContext.Provider value={this.state.settings}>
            <AppBar position="static">
              <Toolbar className={styles.toolbar}>
                <Typography variant="h6">StatWrap</Typography>
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
                  <div className={styles.user}>{this.state.user}</div>
                </section>
              </Toolbar>
            </AppBar>
            {children}
          </SettingsContext.Provider>
        </UserContext.Provider>
      </ThemeProvider>
    );
  }
}
