/* eslint-disable react/no-children-prop */
/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import { Button, Box } from '@material-ui/core';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import styles from './About.css';
import NoteEditor from '../../NoteEditor/NoteEditor';
import TagEditor from '../../TagEditor/TagEditor';
import TagViewer from '../../TagViewer/TagViewer';
import TextEditor from '../../TextEditor/TextEditor';
import LinkedDescription from '../LinkedDescription/LinkedDescription';
import { DescriptionContentType } from '../../../constants/constants';

const about = props => {
  const [editing, setEditing] = useState(false);
  const [descriptionEditor, setDescriptionEditor] = useState(
    props.project.description && props.project.description.contentType
      ? props.project.description.contentType
      : DescriptionContentType.MARKDOWN
  );
  const [descriptionText, setDescriptionText] = useState(
    props.project.description && props.project.description.uri
      ? props.project.description.uriContent
      : props.project.description && props.project.description.content
      ? props.project.description.content
      : ''
  );
  const [descriptionUri, setDescriptionUri] = useState(
    props.project.description && props.project.description.uri ? props.project.description.uri : ''
  );
  const [categories, setCategories] = useState(
    props.project.categories ? props.project.categories : []
  );
  const [notes, setNotes] = useState(props.project.notes ? props.project.notes : []);

  // Derive updated state from props
  React.useEffect(() => {
    setDescriptionText(
      props.project.description && props.project.description.uri
        ? props.project.description.uriContent
        : props.project.description && props.project.description.content
        ? props.project.description.content
        : ''
    );
  }, [props.project.description]);
  React.useEffect(() => {
    setDescriptionUri(
      props.project.description && props.project.description.uri
        ? props.project.description.uri
        : ''
    );
  }, [props.project.description]);
  React.useEffect(() => {
    setCategories(props.project.categories ? props.project.categories : []);
  }, [props.project.categories]);
  React.useEffect(() => {
    setNotes(props.project.notes ? props.project.notes : []);
  }, [props.project.notes]);

  const handleTextChanged = debounce(value => {
    setDescriptionText(value);
  }, 250);

  const handleUriChanged = value => {
    setDescriptionUri(value);
  };

  const handleCategoriesChanged = changedCategories => {
    setCategories(changedCategories);
  };

  const handleDescriptionEditorToggled = () => {
    const currentStatus = descriptionEditor;
    setDescriptionEditor(
      currentStatus === DescriptionContentType.MARKDOWN
        ? DescriptionContentType.URI
        : DescriptionContentType.MARKDOWN
    );
  };

  const handleButtonToggled = () => {
    const currentStatus = editing;
    setEditing(!currentStatus);

    // If we're back to view mode, trigger a save of the data
    if (currentStatus) {
      props.onUpdateDetails(
        descriptionText,
        descriptionEditor === DescriptionContentType.URI ? descriptionUri : null,
        categories
      );
    }
  };

  const updatedNoteHandler = (note, text) => {
    if (note) {
      if (props.onUpdatedNote) {
        props.onUpdatedNote(props.project, text, note);
      }
    } else if (props.onAddedNote) {
      props.onAddedNote(props.project, text);
    }
  };

  const deleteNoteHandler = note => {
    if (props.onDeletedNote) {
      props.onDeletedNote(props.project, note);
    }
  };

  let view = null;
  let buttonLabel = '';
  if (editing) {
    buttonLabel = 'Save Details';
    let descriptionControl = null;
    let descriptionEditorButtonLabel = null;
    if (descriptionEditor === DescriptionContentType.URI) {
      descriptionControl = (
        <LinkedDescription
          uri={descriptionUri}
          projectPath={props.project.path}
          onChange={handleUriChanged}
        />
      );
      descriptionEditorButtonLabel = 'Edit a custom description';
    } else {
      descriptionEditorButtonLabel = 'Select existing file that contains a description';
      descriptionControl = (
        <TextEditor
          content={descriptionText}
          onChange={handleTextChanged}
          placeholder="Describe your project in more detail"
        />
      );
    }
    view = (
      <Box>
        <div className={styles.propertyBlock}>
          <div className={styles.label}>
            Topics <span className={styles.hint}>(Type and hit tab to create)</span>
          </div>
          <TagEditor tags={categories} onChange={handleCategoriesChanged} />
        </div>
        <div className={styles.propertyBlock}>
          <div style={{ display: 'inline-block' }} className={styles.label}>
            Description
          </div>
          <Button
            className={styles.button}
            color="primary"
            onClick={handleDescriptionEditorToggled}
          >
            {descriptionEditorButtonLabel}
          </Button>
          {descriptionControl}
        </div>
      </Box>
    );
  } else {
    buttonLabel = 'Edit Details';
    let tagViewerControl = null;
    if (categories && categories.length > 0) {
      tagViewerControl = <TagViewer className={styles.tagViewer} tags={categories} />;
    }
    let descriptionControl = null;
    if (descriptionText && descriptionText.trim().length > 0) {
      descriptionControl = (
        <div className={styles.markdownViewer}>
          <ReactMarkdown className="markdown-body" plugins={[gfm]} children={descriptionText} />
        </div>
      );
    }
    view = (
      <Box>
        {tagViewerControl}
        {descriptionControl}
        <h2>Project Notes</h2>
        <NoteEditor
          notes={notes}
          onDelete={deleteNoteHandler}
          onEditingComplete={updatedNoteHandler}
        />
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
  onUpdateDetails: PropTypes.func.isRequired,
  onUpdatedNote: PropTypes.func,
  onAddedNote: PropTypes.func,
  onDeletedNote: PropTypes.func
};

export default about;
