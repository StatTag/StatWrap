/* eslint-disable react/forbid-prop-types */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import styles from './ProjectGroup.css';

class ProjectGroup extends Component {
  static propTypes = {
    title: PropTypes.string.isRequired,
    projects: PropTypes.array
  };

  static defaultProps = {
    projects: []
  };

  render() {
    const emptyList =
      this.props.projects && this.props.projects.length > 0 ? null : (
        <div>Missing</div>
      );

    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.title}>{this.props.title}</div>
        {emptyList}
      </div>
    );
  }
}

export default ProjectGroup;
