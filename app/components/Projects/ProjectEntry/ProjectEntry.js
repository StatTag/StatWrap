import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ProjectEntry.css';

const projectEntry = props => {
  let tags = null;
  if (props.project.tags && props.project.tags.length > 0) {
    tags = props.project.tags.map((item, index) => (
      <span className={styles.tag} key={index}>
        <FontAwesomeIcon className={styles.icon} icon="tag" size="xs" />
        {item}
      </span>
    ));
  }

  return (
    <div className={styles.container} data-tid="container">
      <FontAwesomeIcon className={styles.icon} icon="folder" size="xs" />
      <div className={styles.name}>{props.project.name}</div>
      <div className={styles.path}>{props.project.path}</div>
      {tags}
    </div>
  );
};

export default projectEntry;
