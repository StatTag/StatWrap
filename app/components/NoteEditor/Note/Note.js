/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import EditableLabel from '../../EditableLabel/EditableLabel';
import styles from './Note.css';

const noteDetails = props => {
  const { note, onEditingComplete } = props;
  const metadata = note ? (
    <div className={styles.metadata}>
      {note.author} @ {note.updated}
      <FontAwesomeIcon
        className={[styles.icon, styles.delete].join(' ')}
        icon="trash-alt"
        size="xs"
      />
    </div>
  ) : null;
  return (
    <div className={styles.container}>
      {metadata}
      <EditableLabel
        labelClassName={styles.content}
        inputClassName={styles.contentEditor}
        text={note ? note.content : ''}
        labelPlaceHolder="Click to enter your note"
        inputWidth="100%"
        multiline
        onFocusOut={text => onEditingComplete(note, text)}
      />
    </div>
  );
};

noteDetails.propTypes = {
  note: PropTypes.object,
  onEditingComplete: PropTypes.func
};

noteDetails.defaultProps = {
  note: null,
  onEditingComplete: null
};

export default noteDetails;
