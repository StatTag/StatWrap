import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { IconButton, CircularProgress } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import ProjectEntry from './ProjectEntry/ProjectEntry';
import Error from '../Error/Error';
import Constants from '../../constants/constants';
import styles from './Projects.css';

class Projects extends Component {
  renderProjectSection(projects, title, count) {
    if (projects.length === 0){
      return null;
    }

    const projectEntries = projects.map((item) => (
      <ProjectEntry
        key={item.id}
        hasUpdate={item.hasUpdate}
        project={item}
        selected={this.props.selectedProject && this.props.selectedProject.id === item.id}
        onSelect={() => this.props.onSelect(item)}
        onFavoriteClick={(e) => {
          e.stopPropagation();
          this.props.onFavoriteClick(item.id);
        }}
        onMenuClick={(event) => {
          event.stopPropagation();
          this.props.onMenuClick(event.currentTarget, item);
        }}
      />
    ));

    return (
      <div className={styles.projectSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>{title}</span>
          <span className={styles.sectionCount}>{count}</span>
        </div>
        {projectEntries}
      </div>
    );
  }

  render() {
    let projectDetails = <CircularProgress className={styles.progress} />;
    
    if (this.props.loaded) {
      if (this.props.error) {
        projectDetails = (
          <Error>
            {this.props.errorMessage}
            <button type="button" onClick={this.props.onRefresh}>
              Reload Projects
            </button>
          </Error>
        );
      } else {
        // Create three project categories
        const pinnedProjects = this.props.projects.filter((x) => x.favorite);
        const activeProjects = this.props.projects.filter((x) => !x.favorite && (!x.status || x.status === Constants.ProjectStatus.ACTIVE));
        const pastProjects = this.props.projects.filter((x) => !x.favorite && x.status === Constants.ProjectStatus.PAST);
        const sections = [];
        
        if (pinnedProjects.length > 0) {
          sections.push(this.renderProjectSection(pinnedProjects, 'PINNED PROJECTS', pinnedProjects.length));
        }
        
        if (activeProjects.length > 0) {
          sections.push(this.renderProjectSection(activeProjects, 'ACTIVE PROJECTS', activeProjects.length));
        }
        
        if (pastProjects.length > 0) {
          sections.push(this.renderProjectSection(pastProjects, 'PAST PROJECTS', pastProjects.length));
        }

        projectDetails = (
          <>
            {sections.map((section, index) => (
              <React.Fragment key={index}>
                {section}
                {index < sections.length - 1 && <hr className={styles.projectDivider} />}
              </React.Fragment>
            ))}
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
          <IconButton className={styles.floatRight} color="inherit" onClick={this.props.onRefresh}>
            <RefreshIcon />
          </IconButton>
        </div>
        {projectDetails}
        <div
          className={styles.filler}
          onClick={(e) => {
            e.stopPropagation();
            this.props.onSelect(null);
          }}
        />
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
  onAddProject: PropTypes.func.isRequired,
};

Projects.defaultProps = {
  errorMessage: null,
  selectedProject: null,
};

export default Projects;