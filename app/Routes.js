import React from 'react';
import { Switch, Route } from 'react-router';
import { HashRouter } from 'react-router-dom';
import routes from './constants/routes.json';
import App from './containers/App';
import ProjectPage from './containers/ProjectPage/ProjectPage';
import ConfigurationPage from './containers/ConfigurationPage/ConfigurationPage';
import SearchPage from './containers/SearchPage/SearchPage';
import AboutPage from './containers/AboutPage/AboutPage';

export default function () {
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
