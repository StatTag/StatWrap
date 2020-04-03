import React from 'react';
import { Switch, Route } from 'react-router';
import routes from './constants/routes.json';
import App from './containers/App';
import HomePage from './containers/HomePage/HomePage';
import ConfigurationPage from './containers/ConfigurationPage/ConfigurationPage';

export default () => (
  <App>
    <Switch>
      <Route path={routes.CONFIGURATION} component={ConfigurationPage} />
      <Route path={routes.HOME} component={HomePage} />
    </Switch>
  </App>
);
