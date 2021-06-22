/* eslint-disable react/forbid-prop-types */
import React from 'react';
import { IconButton } from '@material-ui/core';
import PropTypes from 'prop-types';
import { FaUser, FaTrash, FaEdit } from 'react-icons/fa';
import TagViewer from '../TagViewer/TagViewer';
import NoteEditor from '../NoteEditor/NoteEditor';
import GeneralUtil from '../../utils/general';
import styles from './Person.css';

const person = props => {
  const { mode } = props;

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

  let tagViewer = null;
  let noteEditor = null;
  if (mode.toLowerCase() === 'project') {
    tagViewer = props.roles ? <TagViewer className={styles.roles} tags={props.roles} /> : null;
    noteEditor = (
      <NoteEditor
        notes={props.notes}
        onDelete={deleteNoteHandler}
        onEditingComplete={updatedNoteHandler}
      />
    );
  }

  const editPersonHandler = () => {
    if (props.onEditPerson) {
      props.onEditPerson(props.id, props.name, props.email, props.affiliation, props.roles);
    }
  };

  const deletePersonHandler = () => {
    if (props.onDeletePerson) {
      props.onDeletePerson(props.id);
    }
  };

  return (
    <div className={styles.container}>
      <FaUser className={styles.icon} />
      <IconButton onClick={deletePersonHandler} aria-label="delete" className={styles.action}>
        <FaTrash fontSize="small" />
      </IconButton>
      <IconButton onClick={editPersonHandler} aria-label="delete" className={styles.action}>
        <FaEdit fontSize="small" />
      </IconButton>
      <div className={styles.name}>{GeneralUtil.formatName(props.name)}</div>
      <div className={styles.affiliation}>{props.affiliation}</div>
      <div className={styles.email}>{props.email}</div>
      {tagViewer}
      {noteEditor}
    </div>
  );
};

person.propTypes = {
  mode: PropTypes.string.isRequired,
  id: PropTypes.string,
  name: PropTypes.object,
  email: PropTypes.string,
  affiliation: PropTypes.string,
  roles: PropTypes.array,
  notes: PropTypes.array,
  onEditPerson: PropTypes.func,
  onDeletePerson: PropTypes.func
};

person.defaultProps = {
  id: '',
  name: null,
  email: '',
  affiliation: '',
  roles: [],
  notes: [],
  onEditPerson: null,
  onDeletePerson: null
};

export default person;
