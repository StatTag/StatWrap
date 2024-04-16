import React, { useState } from 'react';
import TagsInput from 'react-tagsinput';

const tagEditor = (props) => {
  const [tags, setTags] = useState(props.tags);

  const changedTagsHandler = (updatedTags) => {
    setTags(updatedTags);
    if (props.onChange) {
      props.onChange(updatedTags);
    }
  };

  return (
    <TagsInput
      value={tags}
      onChange={changedTagsHandler}
      onlyUnique
      inputProps={{ placeholder: 'Add a topic' }}
    />
  );
};

export default tagEditor;
