// @flow
import * as React from 'react';
import { createMuiTheme, ThemeProvider } from '@material-ui/core/styles';
import { AppBar, Toolbar, Typography, IconButton } from '@material-ui/core';
import SettingsIcon from '@material-ui/icons/Settings';
import SearchIcon from '@material-ui/icons/Search';
import { Link } from 'react-router-dom';
import routes from '../constants/routes.json';
import styles from './App.css';

type Props = {
  children: React.Node
};

export default class App extends React.Component<Props> {
  props: Props;

  render() {
    const { children } = this.props;
    const theme = createMuiTheme({
      palette: {
        type: 'light'
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
