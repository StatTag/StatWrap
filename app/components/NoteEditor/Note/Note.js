/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';
import EditableLabel from '../../EditableLabel/EditableLabel';
import styles from './Note.css';

const noteDetails = (props) => {
  const { note, onEditingComplete, onDelete } = props;
  const metadata = note ? (
    <div className={styles.metadata}>
      {note.author} @ {note.updated}
      <FontAwesomeIcon
        className={[styles.icon, styles.delete].join(' ')}
        icon="trash-alt"
        size="xs"
        onClick={() => {
          if (onDelete) {
            onDelete(note);
          }
        }}
      />
    </div>
  ) : null;
  const hasText = note && note.content && note.content !== '';
  return (
    <div className={styles.container}>
      {metadata}
      <EditableLabel
        labelClassName={hasText ? styles.content : styles.emptyContent}
        inputClassName={styles.contentEditor}
        text={note ? note.content : ''}
        labelPlaceHolder={note ? '(Empty)' : 'Click to enter a new note'}
        inputWidth="100%"
        multiline
        onFocusOut={(text) => onEditingComplete(note, text)}
      />
    </div>
  );
};

noteDetails.propTypes = {
  note: PropTypes.object,
  onEditingComplete: PropTypes.func,
  onDelete: PropTypes.func,
};

noteDetails.defaultProps = {
  note: null,
  onEditingComplete: null,
  onDelete: null,
};

export default noteDetails;
