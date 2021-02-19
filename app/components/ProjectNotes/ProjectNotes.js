/* eslint-disable react/forbid-prop-types */
import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ProjectNotes.css';

const projectNotes = props => {
  const { project, onAddedNote, onUpdatedNote, onDeletedNote } = props;
  const updatedNoteHandler = (note, text) => {
    console.log(note);
    if (note) {
      if (onUpdatedNote) {
        onUpdatedNote(project, text, note);
      }
    } else if (onAddedNote) {
      onAddedNote(project, text);
    }
  };

  const deleteNoteHandler = note => {
    if (onDeletedNote) {
      onDeletedNote(project, note);
    }
  };

  return (
    <div className={styles.container}>
      <NoteEditor
        notes={project.notes}
        onDelete={deleteNoteHandler}
        onEditingComplete={updatedNoteHandler}
      />
    </div>
  );
};

projectNotes.propTypes = {
  project: PropTypes.object.isRequired,
  onAddedNote: PropTypes.func,
  onUpdatedNote: PropTypes.func,
  onDeletedNote: PropTypes.func
};

export default projectNotes;
