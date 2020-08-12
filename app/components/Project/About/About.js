import React, { useState } from 'react';
import { debounce } from 'lodash';
import styles from './About.css';
import TagEditor from '../../TagEditor/TagEditor';
import TextEditor from '../../TextEditor/TextEditor';

const about = props => {
  const [content, setContent] = useState('');
  const [tags, setTags] = useState([]);

  const handleTextChanged = debounce(value => {
    const text = value();
    console.log(text);
    setContent(text);
  }, 250);

  const handleTagsChanged = changedTags => {
    setTags(changedTags);
  };

  return (
    <div className={styles.container}>
      <TagEditor tags={tags} onChange={handleTagsChanged} />
      <TextEditor
        content={content}
        onChange={handleTextChanged}
        placeholder="Describe your project in more detail"
      />
    </div>
  );
};

export default about;
