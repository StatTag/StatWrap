/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import Person from '../../Person/Person';
import styles from './PeopleCardList.css';

function peopleCardList(props) {
  const {
    mode,
    list,
    onEdit,
    onDelete,
    onAddedPersonNote,
    onUpdatedPersonNote,
    onDeletedPersonNote,
  } = props;

  const deletePersonHandler = (person) => {
    if (onDelete) {
      onDelete(person);
    }
  };

  const editPersonHandler = (person) => {
    if (onEdit) {
      const existingPerson = list.find((x) => x.id === person.id);
      onEdit(existingPerson);
    }
  };

  const addedNoteHandler = (personId, text) => {
    if (onAddedPersonNote) {
      const person = list.find((x) => x.id === personId);
      onAddedPersonNote(person, text);
    }
  };

  const updatedNoteHandler = (personId, text, note) => {
    if (onUpdatedPersonNote) {
      const person = list.find((x) => x.id === personId);
      onUpdatedPersonNote(person, text, note);
    }
  };

  const deletedNoteHandler = (personId, note) => {
    if (onDeletedPersonNote) {
      const person = list.find((x) => x.id === personId);
      onDeletedPersonNote(person, note);
    }
  };

  const personList = list.map((x) => (
    <Person
      key={x.id}
      mode={mode}
      id={x.id}
      name={x.name}
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

  return <div className={styles.container}>{personList}</div>;
}

peopleCardList.propTypes = {
  list: PropTypes.array,
  mode: PropTypes.string.isRequired,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onAddedPersonNote: PropTypes.func,
  onUpdatedPersonNote: PropTypes.func,
  onDeletedPersonNote: PropTypes.func,
};

peopleCardList.defaultProps = {
  list: [],
  onEdit: null,
  onDelete: null,
  onAddedPersonNote: null,
  onUpdatedPersonNote: null,
  onDeletedPersonNote: null,
};

export default peopleCardList;
