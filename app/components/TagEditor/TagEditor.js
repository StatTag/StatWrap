import React, { useState } from 'react';
import TagsInput from 'react-tagsinput';

const tagEditor = (props) => {
  const [tags, setTags] = useState(props.tags);
  const [inputValue, setInputValue] = useState('');

  const changedTagsHandler = (updatedTags) => {
    setTags(updatedTags);
    if (props.onChange) {
      props.onChange(updatedTags);
    }
  };

  const changedInputHandler = (value) => {
    setInputValue(value);
    if (props.onInputChange) {
      props.onInputChange(value);
    }
  };

  return (
    <TagsInput
      value={tags}
      onChange={changedTagsHandler}
      inputValue={inputValue}
      onChangeInput={changedInputHandler}
      onlyUnique
      inputProps={{ placeholder: 'Add a topic' }}
    />
  );
};

export default tagEditor;
