import React, { Fragment } from 'react';
import { createRoot } from 'react-dom/client';
import Root from './containers/Root';
import './app.global.css';

const AppContainer = Fragment;

const container = document.getElementById('root');
const root = createRoot(container);

root.render(
  <AppContainer>
    <Root />
  </AppContainer>,
);
