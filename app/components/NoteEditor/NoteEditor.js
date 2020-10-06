// Notes get a GUID
// Many different users can add/edit notes
// Eventually editing should be restricted to user who created it - out of scope for v1
// Show the history of past notes
// Allow editing and deleting past notes
import React, { useState } from 'react';
import TextEditor from '../TextEditor/TextEditor';
import Note from './Note/Note';
import styles from './NoteEditor.css';

const noteEditor = props => {
  const { notes } = props;
  return (
    <div className={styles.container}>
      <Note note={{author: 'Luke Rasmussen', updated: '2020-10-26 10:35:00 am', content: 'This is a test note created by us for testing purposes.\r\n\r\nIt includes some newlines just to make sure spacing is correct.'}} />
      <hr />
      <TextEditor content={''} />
    </div>
  );
};

export default noteEditor;
