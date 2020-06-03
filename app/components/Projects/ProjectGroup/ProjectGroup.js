/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import PropTypes from 'prop-types';
import ProjectEntry from '../ProjectEntry/ProjectEntry';
import styles from './ProjectGroup.css';

const projectGroup = props => {
  let projectList = <div className={styles.emptyMessage}>{props.emptyMessage}</div>;
  if (props.projects && props.projects.length > 0) {
    projectList = props.projects.map(item => <ProjectEntry key={item.id} project={item} />);
  }

  return (
    <div className={styles.container} data-tid="container">
      <div className={styles.title}>{props.title}</div>
      {projectList}
    </div>
  );
};

projectGroup.propTypes = {
  title: PropTypes.string.isRequired,
  emptyMessage: PropTypes.string,
  projects: PropTypes.array
};

projectGroup.defaultProps = {
  emptyMessage: 'There are no projects to display in this list',
  projects: []
};

export default projectGroup;
