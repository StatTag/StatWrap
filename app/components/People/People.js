/* eslint-disable react/forbid-prop-types */
import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@material-ui/core';
import Person from '../Person/Person';
import CreateUpdatePersonDialog from '../../containers/CreateUpdatePersonDialog/CreateUpdatePersonDialog';
import SettingsContext from '../../contexts/Settings';
import styles from './People.css';

const people = props => {
  const {
    project,
    mode,
    list,
    onDelete,
    onSave,
    onAddedPersonNote,
    onUpdatedPersonNote,
    onDeletedPersonNote
  } = props;
  // UI state flag to let us know when we're in the process of adding/editing a person
  const [editing, setEditing] = useState(false);
  // This key is part of a trick to get React to throw out and recreate the Create Project
  // dialog when we have disposed of it - either by creating a project or cancelling.  This
  // tracks a sequential number that, when changed, signals React that the dialog can be
  // recreated. We don't care what this key is, it just has to change.
  const [dialogKey, setDialogKey] = useState(0);
  const [editPersonId, setEditPersonId] = useState(null);
  const [editPersonName, setEditPersonName] = useState(null);
  const [editPersonEmail, setEditPersonEmail] = useState(null);
  const [editPersonAffiliation, setEditPersonAffiliation] = useState(null);
  const [editPersonRoles, setEditPersonRoles] = useState(null);

  const settings = useContext(SettingsContext);

  const handleCloseAddEditPerson = () => {
    setEditing(false);
  };

  const deletePersonHandler = id => {
    if (onDelete) {
      onDelete(id);
    }
  };

  const handleSaved = person => {
    if (onSave) {
      onSave(person);
    }
  };

  const addPersonHandler = () => {
    setDialogKey(dialogKey + 1);
    setEditPersonId(null);
    setEditPersonName(null);
    setEditPersonEmail(null);
    setEditPersonAffiliation(null);
    setEditPersonRoles(null);
    setEditing(true);
  };

  const editPersonHandler = (id, name, email, affiliation, roles) => {
    setDialogKey(dialogKey + 1);
    setEditPersonId(id);
    setEditPersonName(name);
    setEditPersonEmail(email);
    setEditPersonAffiliation(affiliation);
    setEditPersonRoles(roles);
    setEditing(true);
  };

  const addedNoteHandler = (personId, text) => {
    if (onAddedPersonNote) {
      const person = list.find(x => x.id === personId);
      onAddedPersonNote(person, text);
    }
  };

  const updatedNoteHandler = (personId, text, note) => {
    if (onUpdatedPersonNote) {
      const person = list.find(x => x.id === personId);
      onUpdatedPersonNote(person, text, note);
    }
  };

  const deletedNoteHandler = (personId, note) => {
    if (onDeletedPersonNote) {
      const person = list.find(x => x.id === personId);
      onDeletedPersonNote(person, note);
    }
  };

  const personList = list.map(x => (
    <Person
      key={x.id}
      mode={mode}
      id={x.id}
      name={x.name}
      email={x.email}
      affiliation={x.affiliation}
      roles={x.roles}
      notes={x.notes}
      onAddedNote={addedNoteHandler}
      onUpdatedNote={updatedNoteHandler}
      onDeletedNote={deletedNoteHandler}
      onDeletePerson={deletePersonHandler}
      onEditPerson={editPersonHandler}
    />
  ));

  return (
    <div className={styles.container}>
      <Button className={styles.button} color="primary" onClick={addPersonHandler}>
        Add Person
      </Button>
      <div className={styles.personContainer}>{personList}</div>
      <CreateUpdatePersonDialog
        key={dialogKey}
        mode={mode}
        directory={settings.directory}
        project={project}
        id={editPersonId}
        name={editPersonName}
        email={editPersonEmail}
        affiliation={editPersonAffiliation}
        roles={editPersonRoles}
        open={editing}
        onClose={handleCloseAddEditPerson}
        onSave={handleSaved}
      />
    </div>
  );
};

people.propTypes = {
  project: PropTypes.object,
  list: PropTypes.array,
  mode: PropTypes.string.isRequired,
  onSave: PropTypes.func,
  onDelete: PropTypes.func,
  onAddedPersonNote: PropTypes.func,
  onUpdatedPersonNote: PropTypes.func,
  onDeletedPersonNote: PropTypes.func
};

people.defaultProps = {
  project: null,
  list: [],
  onSave: null,
  onDelete: null,
  onAddedPersonNote: null,
  onUpdatedPersonNote: null,
  onDeletedPersonNote: null
};

export default people;