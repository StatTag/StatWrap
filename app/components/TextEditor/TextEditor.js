import React, { useState } from 'react';
import Editor from 'rich-markdown-editor';
import styles from './TextEditor.css';

const textEditor = props => {
  const [content, setContent] = useState('');
  return (
    <div className={styles.container}>
      <Editor
        placeholder={props.placeholder}
        defaultValue={props.content}
        value={content}
        onChange={props.onChange}
      />
    </div>
  );
};

export default textEditor;
