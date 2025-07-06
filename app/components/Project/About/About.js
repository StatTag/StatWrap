import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Button,
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from '@mui/material';
import { ExpandMore, ChevronRight } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import gfm from 'remark-gfm';
import PropTypes from 'prop-types';
import { debounce } from 'lodash';
import styles from './About.css';
import NoteEditor from '../../NoteEditor/NoteEditor';
import TagEditor from '../../TagEditor/TagEditor';
import TagViewer from '../../TagViewer/TagViewer';
import SimpleMDE from 'react-simplemde-editor';
import LinkedDescription from '../LinkedDescription/LinkedDescription';
import ProjectUpdateSummary from '../ProjectUpdateSummary/ProjectUpdateSummary';
import { DescriptionContentType } from '../../../constants/constants';
import { SplitMarkdownSections } from '../../../utils/SplitMarkdownSections';

function About(props) {
  const [editing, setEditing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState({});

  const [initialState, setInitialState] = useState({
    descriptionEditor:
      props.project.description && props.project.description.contentType
        ? props.project.description.contentType
        : DescriptionContentType.MARKDOWN,
    descriptionText:
      props.project.description && props.project.description.uri
        ? props.project.description.uriContent
        : props.project.description && props.project.description.content
          ? props.project.description.content
          : '',
    descriptionUri:
      props.project.description && props.project.description.uri
        ? props.project.description.uri
        : '',
    categories: props.project.categories ? props.project.categories : [],
    notes: props.project.notes ? props.project.notes : [],
  });

  useEffect(() => {
    const newState = {
      descriptionEditor:
        props.project.description && props.project.description.contentType
          ? props.project.description.contentType
          : DescriptionContentType.MARKDOWN,
      descriptionText:
        props.project.description && props.project.description.uri
          ? props.project.description.uriContent
          : props.project.description && props.project.description.content
            ? props.project.description.content
            : '',
      descriptionUri:
        props.project.description && props.project.description.uri
          ? props.project.description.uri
          : '',
      categories: props.project.categories ? props.project.categories : [],
      notes: props.project.notes ? props.project.notes : [],
    };

    setInitialState(newState);
    setDescriptionEditor(newState.descriptionEditor);
    setDescriptionText(newState.descriptionText);
    setDescriptionUri(newState.descriptionUri);
    setCategories(newState.categories);
    setNotes(newState.notes);
  }, [props.project]);

  const [descriptionEditor, setDescriptionEditor] = useState(initialState.descriptionEditor);
  const [descriptionText, setDescriptionText] = useState(initialState.descriptionText);
  const [descriptionUri, setDescriptionUri] = useState(initialState.descriptionUri);
  const [categories, setCategories] = useState(initialState.categories);
  const [notes, setNotes] = useState(initialState.notes);

  useEffect(() => {
    setDescriptionText(
      props.project.description && props.project.description.uri
        ? props.project.description.uriContent
        : props.project.description && props.project.description.content
          ? props.project.description.content
          : '',
    );
  }, [props.project.description]);

  useEffect(() => {
    setDescriptionUri(
      props.project.description && props.project.description.uri
        ? props.project.description.uri
        : '',
    );
  }, [props.project.description]);

  useEffect(() => {
    setCategories(props.project.categories ? props.project.categories : []);
  }, [props.project.categories]);

  useEffect(() => {
    setNotes(props.project.notes ? props.project.notes : []);
  }, [props.project.notes]);
  useEffect(() => {
    setCollapsedSections({});
  }, [props.project.id]);

  const handleTextChanged = useCallback((value: string) => {
    setDescriptionText(value);
  }, []);

  // Per https://github.com/RIP21/react-simplemde-editor
  // "Note that you need to useMemo to memoize options so they do not change on each rerender!"
  const autofocusSpellcheckerOptions = useMemo(() => {
    return {
      autofocus: true,
      spellChecker: true,
    };
  }, []);

  const handleUriChanged = (value) => {
    setDescriptionUri(value);
  };

  const handleCategoriesChanged = (changedCategories) => {
    setCategories(changedCategories);
  };

  const handleDescriptionEditorToggled = () => {
    const currentStatus = descriptionEditor;
    setDescriptionEditor(
      currentStatus === DescriptionContentType.MARKDOWN
        ? DescriptionContentType.URI
        : DescriptionContentType.MARKDOWN,
    );
  };

  const handleSave = () => {
    setEditing(false);
    props.onUpdateDetails(
      descriptionText,
      descriptionEditor === DescriptionContentType.URI ? descriptionUri : null,
      categories,
    );
  };

  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setShowCancelDialog(true);
    } else {
      revertChanges();
    }
  };

  const revertChanges = () => {
    setDescriptionEditor(initialState.descriptionEditor);
    setDescriptionText(initialState.descriptionText);
    setDescriptionUri(initialState.descriptionUri);
    setCategories(initialState.categories);
    setNotes(initialState.notes);
    setEditing(false);
    setShowCancelDialog(false);
  };

  const hasUnsavedChanges = () => {
    return (
      descriptionEditor !== initialState.descriptionEditor ||
      descriptionText !== initialState.descriptionText ||
      descriptionUri !== initialState.descriptionUri ||
      JSON.stringify(categories) !== JSON.stringify(initialState.categories) ||
      JSON.stringify(notes) !== JSON.stringify(initialState.notes)
    );
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

  const deleteNoteHandler = (note) => {
    if (props.onDeletedNote) {
      props.onDeletedNote(props.project, note);
    }
  };

  const handleSectionToggle = (idx) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  let view = null;
  if (editing) {
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
        <SimpleMDE
          options={autofocusSpellcheckerOptions}
          value={descriptionText}
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
    let tagViewerControl = null;
    if (categories && categories.length > 0) {
      tagViewerControl = <TagViewer className={styles.tagViewer} tags={categories} />;
    }
    const updatesControl = (
      <ProjectUpdateSummary updates={props.updates} onClickLink={props.onClickUpdatesLink} />
    );
    let descriptionControl = null;
    if (descriptionText && descriptionText.trim().length > 0) {
      const sections = SplitMarkdownSections(descriptionText);
      descriptionControl = (
        <div className={styles.markdownViewer}>
          {sections.map((section, idx) => {
            const HeadingTag = `h${section.heading.depth}`;
            const isCollapsed = collapsedSections[idx];
            return (
              <div key={idx} className={styles.sectionBlock}>
                <div className={styles.collapsibleHeading}>
                  <IconButton
                    size="small"
                    onClick={() => handleSectionToggle(idx)}
                    aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                    style={{ marginRight: '8px' }}
                  >
                    {isCollapsed ? <ChevronRight /> : <ExpandMore />}
                  </IconButton>
                  <HeadingTag>{section.heading.text}</HeadingTag>
                </div>
                {!isCollapsed && <ReactMarkdown remarkPlugins={[gfm]} children={section.content} />}
              </div>
            );
          })}
        </div>
      );
    }
    view = (
      <Box>
        {tagViewerControl}
        {updatesControl}
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
      {editing ? (
        <>
          <Button
            className={styles.button}
            variant="outlined"
            color="secondary"
            size="small"
            onClick={handleCancel}
            style={{ marginTop: '32px' }}
          >
            Cancel
          </Button>
          <Button
            className={styles.button}
            variant="outlined"
            color="primary"
            size="small"
            onClick={handleSave}
            style={{
              marginTop: '32px',
              marginLeft: '20px',
              marginRight: '20px',
            }}
          >
            Save Details
          </Button>
        </>
      ) : (
        <Button
          className={styles.button}
          variant="outlined"
          color="primary"
          size="small"
          onClick={() => setEditing(true)}
        >
          Edit Details
        </Button>
      )}
      {view}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle style={{ color: 'white' }}>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have made changes. Do you wish to discard those changes?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={revertChanges} color="primary">
            Yes
          </Button>
          <Button onClick={() => setShowCancelDialog(false)} color="secondary">
            No
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

About.propTypes = {
  project: PropTypes.object.isRequired,
  updates: PropTypes.object,
  onUpdateDetails: PropTypes.func.isRequired,
  onUpdatedNote: PropTypes.func,
  onAddedNote: PropTypes.func,
  onDeletedNote: PropTypes.func,
  onClickUpdatesLink: PropTypes.func,
};

export default About;
