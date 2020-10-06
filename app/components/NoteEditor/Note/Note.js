import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './Note.css';

const noteDetails = props => {
  const { note } = props;
  return (
    <div className={styles.container}>
      <div className={styles.metadata}>
        {note.author} @ {note.updated}
        <FontAwesomeIcon
          className={[styles.icon, styles.delete].join(' ')}
          icon="trash-alt"
          size="xs"
        />
      </div>
      <div className={styles.content}>{note.content}</div>
    </div>
  );
};

export default noteDetails;
