/* eslint-disable react/forbid-prop-types */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@material-ui/core';
import Person from '../Person/Person';
import AddEditPersonDialog from '../../containers/AddEditPersonDialog/AddEditPersonDialog';
import styles from './People.css';

// let test = [
//   {
//     id: '1-2-3',
//     name: {
//       first: 'Luke',
//       middle: '',
//       last: 'Rasmussen',
//       prefix: '',
//       suffix: ''
//     },
//     affiliation: 'Northwestern University',
//     email: 'luke.rasmussen@northwestern.edu',
//     roles: ['Co-I', 'Analyst']
//   },
//   {
//     id: '2-3-4',
//     name: {
//       first: 'Leah',
//       middle: '',
//       last: 'Welty',
//       prefix: 'Dr.',
//       suffix: ''
//     },
//     affiliation: 'Northwestern University',
//     email: 'lwelty@northwestern.edu',
//     roles: ['PI', 'Faculty']
//   },
//   {
//     id: '3-4-5',
//     name: {
//       first: 'Eric',
//       middle: 'W',
//       last: 'Whitley'
//     },
//     email: 'eric.whitley@northwestern.edu'
//   }
// ];

const people = props => {
  const { project, mode, list } = props;
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

  const handleCloseAddEditPerson = refresh => {
    setDialogKey(dialogKey + 1);
    setEditing(false);
  };

  const deletePersonHandler = id => {
    console.log(list);
    // test = test.filter(x => x.id !== id);
    // console.log(test);
  };

  const addPersonHandler = () => {
    setEditPersonId(null);
    setEditPersonName(null);
    setEditPersonEmail(null);
    setEditPersonAffiliation(null);
    setEditPersonRoles(null);
    setEditing(true);
  };

  const editPersonHandler = (id, name, email, affiliation, roles) => {
    setEditPersonId(id);
    setEditPersonName(name);
    setEditPersonEmail(email);
    setEditPersonAffiliation(affiliation);
    setEditPersonRoles(roles);
    setEditing(true);
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
      notes={[]}
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
      <AddEditPersonDialog
        key={dialogKey}
        mode={mode}
        project={project}
        id={editPersonId}
        name={editPersonName}
        email={editPersonEmail}
        affiliation={editPersonAffiliation}
        roles={editPersonRoles}
        open={editing}
        onClose={handleCloseAddEditPerson}
      />
    </div>
  );
};

people.propTypes = {
  project: PropTypes.object,
  list: PropTypes.array,
  mode: PropTypes.string.isRequired
};

people.defaultProps = {
  project: null,
  list: []
};

export default people;
