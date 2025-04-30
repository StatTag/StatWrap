import React from 'react';
import { HashRouter, Switch, Route } from 'react-router-dom';
import routes from './constants/routes.json';
import App from './containers/App';
import ProjectPage from './containers/ProjectPage/ProjectPage';
import ConfigurationPage from './containers/ConfigurationPage/ConfigurationPage';
import SearchPage from './containers/SearchPage/SearchPage';
import AboutPage from './containers/AboutPage/AboutPage';

export default function Routes() {
  return (
    <HashRouter>
      <App>
        <Switch>
          <Route path={routes.ABOUT} component={AboutPage} />
          <Route path={routes.CONFIGURATION} component={ConfigurationPage} />
          <Route path={routes.SEARCH} component={SearchPage} />
          <Route path={routes.HOME} component={ProjectPage} />
        </Switch>
      </App>
    </HashRouter>
  );
}
