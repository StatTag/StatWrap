/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { IconButton, CircularProgress } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import ProjectEntry from './ProjectEntry/ProjectEntry';
import Error from '../Error/Error';
import styles from './Projects.css';

export default class Projects extends Component {
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
