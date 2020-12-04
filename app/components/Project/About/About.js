/* eslint-disable react/no-children-prop */
/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import { Button, Box } from '@material-ui/core';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import styles from './About.css';
import TagEditor from '../../TagEditor/TagEditor';
import TagViewer from '../../TagViewer/TagViewer';
import TextEditor from '../../TextEditor/TextEditor';

const about = props => {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(
    props.project.description ? props.project.description : ''
  );
  const [categories, setCategories] = useState(
    props.project.categories ? props.project.categories : []
  );

  // Derive updated state from props
  React.useEffect(() => {
    setDescription(props.project.description ? props.project.description : '');
  }, [props.project.description]);
  React.useEffect(() => {
    setCategories(props.project.categories ? props.project.categories : []);
  }, [props.project.categories]);

  const handleTextChanged = debounce(value => {
    setDescription(value);
  }, 250);

  const handleCategoriesChanged = changedCategories => {
    setCategories(changedCategories);
  };

  const handleButtonToggled = () => {
    const currentStatus = editing;
    setEditing(!currentStatus);

    // If we're back to view mode, trigger a save of the data
    if (currentStatus) {
      props.onUpdateDetails(description, categories);
    }
  };

  let view = null;
  let buttonLabel = '';
  if (editing) {
    buttonLabel = 'Save Details';
    view = (
      <Box>
        <div className={styles.propertyBlock}>
          <div className={styles.label}>
            Topics <span className={styles.hint}>(Type and hit tab to create)</span>
          </div>
          <TagEditor tags={categories} onChange={handleCategoriesChanged} />
        </div>
        <div className={styles.propertyBlock}>
          <div className={styles.label}>Description</div>
          <TextEditor
            content={description}
            onChange={handleTextChanged}
            placeholder="Describe your project in more detail"
          />
        </div>
      </Box>
    );
  } else {
    buttonLabel = 'Edit Details';
    view = (
      <Box>
        <TagViewer className={styles.tagViewer} tags={categories} />
        <ReactMarkdown className="markdown-body" plugins={[gfm]} children={description} />
      </Box>
    );
  }

  return (
    <div className={styles.container}>
      <Button className={styles.button} color="primary" onClick={handleButtonToggled}>
        {buttonLabel}
      </Button>
      {view}
    </div>
  );
};

about.propTypes = {
  project: PropTypes.object.isRequired,
  onUpdateDetails: PropTypes.func.isRequired
};

export default about;
