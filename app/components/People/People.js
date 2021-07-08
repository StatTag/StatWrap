/* eslint-disable react/forbid-prop-types */
import React, { useState, useContext } from 'react';
import PropTypes from 'prop-types';
import { FaTh, FaThList } from 'react-icons/fa';
import { Button } from '@material-ui/core';
import { ToggleButtonGroup, ToggleButton } from '@material-ui/lab';
import CreateUpdatePersonDialog from '../../containers/CreateUpdatePersonDialog/CreateUpdatePersonDialog';
import PeopleCardList from './PeopleCardList/PeopleCardList';
import PeopleTable from './PeopleTable/PeopleTable';
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

  // This key is part of a trick to get React to throw out and recreate the Create Project
  // dialog when we have disposed of it - either by creating a project or cancelling.  This
  // tracks a sequential number that, when changed, signals React that the dialog can be
  // recreated. We don't care what this key is, it just has to change.
  const [dialogKey, setDialogKey] = useState(0);
  const [editPersonId, setEditPersonId] = useState(null);
  const [editPersonName, setEditPersonName] = useState(null);
  const [editPersonAffiliation, setEditPersonAffiliation] = useState(null);
  const [editPersonRoles, setEditPersonRoles] = useState(null);

  const settings = useContext(SettingsContext);

  // UI state flag to let us know when we're in the process of adding/editing a person
  const [editing, setEditing] = useState(false);

  const [display, setDisplay] = React.useState('card');

  const handleCloseAddEditPerson = () => {
    setEditing(false);
  };

  const handleSaved = person => {
    if (onSave) {
      onSave(person);
    }
  };

  const deletePersonHandler = person => {
    if (onDelete) {
      onDelete(person);
    }
  };

  const handleDisplay = (event, newDisplay) => {
    setDisplay(newDisplay);
  };

  const addPersonHandler = () => {
    setDialogKey(dialogKey + 1);
    setEditPersonId(null);
    setEditPersonName(null);
    setEditPersonAffiliation(null);
    setEditPersonRoles(null);
    setEditing(true);
  };

  const editPersonHandler = person => {
    setDialogKey(dialogKey + 1);
    setEditPersonId(person.id);
    setEditPersonName(person.name);
    setEditPersonAffiliation(person.affiliation);
    setEditPersonRoles(person.roles);
    setEditing(true);
  };

  const addedNoteHandler = (person, text) => {
    if (onAddedPersonNote) {
      onAddedPersonNote(person, text);
    }
  };

  const updatedNoteHandler = (person, text, note) => {
    if (onUpdatedPersonNote) {
      onUpdatedPersonNote(person, text, note);
    }
  };

  const deletedNoteHandler = (person, note) => {
    if (onDeletedPersonNote) {
      onDeletedPersonNote(person, note);
    }
  };

  let personList = null;
  if (display === 'card') {
    personList = (
      <PeopleCardList
        list={list}
        mode={mode}
        onEdit={editPersonHandler}
        onDelete={deletePersonHandler}
        onAddedPersonNote={addedNoteHandler}
        onUpdatedPersonNote={updatedNoteHandler}
        onDeletedPersonNote={deletedNoteHandler}
      />
    );
  } else if (display === 'table') {
    personList = (
      <PeopleTable
        mode={mode}
        list={list}
        onEdit={editPersonHandler}
        onDelete={deletePersonHandler}
      />
    );
  }

  return (
    <div className={styles.container}>
      <ToggleButtonGroup
        value={display}
        exclusive
        onChange={handleDisplay}
        aria-label="select person list display"
      >
        <ToggleButton value="card" aria-label="card list">
          <FaTh />
        </ToggleButton>
        <ToggleButton value="table" aria-label="table">
          <FaThList />
        </ToggleButton>
      </ToggleButtonGroup>
      <Button className={styles.button} color="primary" onClick={addPersonHandler}>
        Add Person
      </Button>
      {personList}
      <CreateUpdatePersonDialog
        key={dialogKey}
        mode={mode}
        directory={settings.directory}
        project={project}
        id={editPersonId}
        name={editPersonName}
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
