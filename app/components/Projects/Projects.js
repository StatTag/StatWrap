/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { IconButton, CircularProgress } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import ProjectEntry from './ProjectEntry/ProjectEntry';
import Error from '../Error/Error';
import styles from './Projects.css';

class Projects extends Component {
  render() {
    let projectDetails = <CircularProgress className={styles.progress} />;
    if (this.props.loaded) {
      if (this.props.error) {
        projectDetails = (
          <>
            <Error>
              {this.props.errorMessage}
              <button type="button" onClick={this.props.onRefresh}>
                Reload Projects
              </button>
            </Error>
          </>
        );
      } else {
        const pinnedProjects = this.props.projects
          .filter(x => x.favorite)
          .map(item => (
            <ProjectEntry
              key={item.id}
              project={item}
              onSelect={() => this.props.onSelect(item)}
              onFavoriteClick={() => this.props.onFavoriteClick(item.id)}
              onMenuClick={event => this.props.onMenuClick(event.currentTarget, item)}
            />
          ));
        const projects = this.props.projects
          .filter(x => !x.favorite)
          .map(item => (
            <ProjectEntry
              key={item.id}
              project={item}
              selected={this.props.selectedProject && this.props.selectedProject.id === item.id}
              onSelect={() => this.props.onSelect(item)}
              onFavoriteClick={() => this.props.onFavoriteClick(item.id)}
              onMenuClick={event => this.props.onMenuClick(event.currentTarget, item)}
            />
          ));
        const divider =
          projects.length > 0 && pinnedProjects.length > 0 ? (
            <hr className={styles.projectDivider} />
          ) : null;
        projectDetails = (
          <>
            {pinnedProjects}
            {divider}
            {projects}
          </>
        );
      }
    }

    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.titleContainer}>
          <div className={styles.title}>Projects</div>
          <IconButton color="inherit" onClick={this.props.onAddProject}>
            <AddIcon />
          </IconButton>
        </div>
        {projectDetails}
      </div>
    );
  }
}

Projects.propTypes = {
  projects: PropTypes.array.isRequired,
  selectedProject: PropTypes.object,
  loaded: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
  onRefresh: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  onFavoriteClick: PropTypes.func.isRequired,
  onMenuClick: PropTypes.func.isRequired,
  onAddProject: PropTypes.func.isRequired
};

Projects.defaultProps = {
  errorMessage: null,
  selectedProject: null
};

export default Projects;
