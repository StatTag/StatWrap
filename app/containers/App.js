/* eslint-disable react/prop-types */
import * as React from 'react';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { AppBar, Toolbar, Typography, IconButton } from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';
import SearchIcon from '@material-ui/icons/Search';
import { library } from '@fortawesome/fontawesome-svg-core';
import {
  faFolder,
  faTag,
  faThumbtack,
  faEllipsisH,
  faTrashAlt
} from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import styles from './App.css';

// This is where we register all of our font-awesome icons that are used throughout the app.
// See https://github.com/FortAwesome/react-fontawesome#build-a-library-to-reference-icons-throughout-your-app-more-conveniently
library.add(faFolder, faTag, faThumbtack, faEllipsisH, faTrashAlt);

export default class App extends React.Component {
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
        <AppBar position="static">
          <Toolbar>
            <Link to={routes.HOME}>
              <Typography variant="h6" className={styles.title}>
                StatWrap
              </Typography>
            </Link>
            <section className={styles.rightToolbar}>
              <Link to={routes.SEARCH}>
                <IconButton aria-label="search">
                  <SearchIcon />
                </IconButton>
              </Link>
              <Link to={routes.CONFIGURATION}>
                <IconButton aria-label="settings">
                  <SettingsIcon />
                </IconButton>
              </Link>
            </section>
          </Toolbar>
        </AppBar>
        {children}
      </ThemeProvider>
    );
  }
}
