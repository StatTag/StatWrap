import React, { useContext } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import routes from './constants/routes.json';
import App from './containers/App';
import ProjectPage from './containers/ProjectPage/ProjectPage';
import ConfigurationPage from './containers/ConfigurationPage/ConfigurationPage';
import SearchPage from './containers/SearchPage/SearchPage';
import AboutPage from './containers/AboutPage/AboutPage';
import ProjectContext from './contexts/Project';

const ProjectPageWithContext = (props) => {
  const { selectedProjectId, onSelectProject } = useContext(ProjectContext);
  return (
    <ProjectPage
      {...props}
      selectedProjectId={selectedProjectId}
      onSelectProject={onSelectProject}
    />
  );
};

export default function AppRoutes() {
  return (
    <HashRouter>
      <App>
        <Routes>
          <Route path={routes.ABOUT} element={<AboutPage />} />
          <Route path={routes.CONFIGURATION} element={<ConfigurationPage />} />
          <Route path={routes.SEARCH} element={<SearchPage />} />
          <Route path={routes.HOME} element={<ProjectPageWithContext />} />
        </Routes>
      </App>
    </HashRouter>
  );
}
