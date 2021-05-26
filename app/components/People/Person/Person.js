import React from 'react';
import PropTypes from 'prop-types';
import { FaUser } from 'react-icons/fa';
import styles from './Person.css';

const person = props => {
  return (
    <div className={styles.container}>
      <FaUser className={styles.icon} />
      <div className={styles.name}>{props.name}</div>
    </div>
  );
};

person.propTypes = {
  name: PropTypes.string
};

person.defaultProps = {
  name: '(unnamed)'
};

export default person;
