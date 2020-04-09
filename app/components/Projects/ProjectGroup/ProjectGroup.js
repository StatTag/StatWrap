/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import PropTypes from 'prop-types';
import styles from './ProjectGroup.css';

const projectGroup = props => {
  const emptyList =
    props.projects && props.projects.length > 0 ? null : (
      <div className={styles.emptyMessage}>{props.emptyMessage}</div>
    );

  return (
    <div className={styles.container} data-tid="container">
      <div className={styles.title}>{props.title}</div>
      {emptyList}
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
