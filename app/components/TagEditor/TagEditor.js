import React, { useState } from 'react';
import TagsInput from 'react-tagsinput';

const tagEditor = props => {
  const [tags, setTags] = useState([]);

  const changedTagsHandler = updatedTags => {
    setTags(updatedTags);
    if (props.onChange) {
      props.onChange(updatedTags);
    }
  };

  return <TagsInput value={tags} onChange={changedTagsHandler} onlyUnique />;
};

export default tagEditor;
