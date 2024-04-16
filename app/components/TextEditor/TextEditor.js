import React from 'react';
import Editor from 'react-simplemde-editor';
import styles from './TextEditor.css';

const textEditor = (props) => {
  return (
    <div className={styles.container}>
      <Editor
        placeholder={props.placeholder}
        value={props.content}
        onChange={props.onChange}
        options={{
          autofocus: true,
          spellChecker: true,
        }}
      />
    </div>
  );
};

export default textEditor;
