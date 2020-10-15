// Notes get a GUID
// Many different users can add/edit notes
// Eventually editing should be restricted to user who created it - out of scope for v1
// Show the history of past notes
// Allow editing and deleting past notes
import React from 'react';
import Note from './Note/Note';
import styles from './NoteEditor.css';

const noteEditor = props => {
  const { notes, onEditingComplete } = props;
  const notesControls = notes
    ? notes.map(n => <Note key={n.id} note={n} onEditingComplete={(note, text) => onEditingComplete(note, text)} />)
    : null;
  return (
    <div className={styles.container}>
      {notesControls}
      <hr />
      <Note onEditingComplete={(note, text) => onEditingComplete(note, text)} />
    </div>
  );
};

export default noteEditor;
