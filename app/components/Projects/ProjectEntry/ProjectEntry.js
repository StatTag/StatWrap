import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ProjectEntry.css';

const projectEntry = props => {
  const iconClasses = [styles.icon];
  if (!props.project.favorite) {
    iconClasses.push(styles.placeholder);
  }

  return (
    <div className={styles.container} data-tid="container">
      <div className={styles.name}>
        <span>
          <FontAwesomeIcon
            className={iconClasses.join(' ')}
            icon="thumbtack"
            size="xs"
            onClick={props.onFavoriteClick}
          />
          {props.project.name}
        </span>
      </div>
      <div className={styles.path}>{props.project.path}</div>
    </div>
  );
};

export default projectEntry;
