import React from 'react';
import Person from './Person/Person';
import styles from './People.css';

const people = props => {
  return (
    <div className={styles.container}>
      <Person />
      <Person />
      <Person />
      <Person />
    </div>
  );
};

export default people;
