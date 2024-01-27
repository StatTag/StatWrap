import React from 'react';
import styles from './Welcome.css';

const welcome = () => {
  return (
    <div className={styles.container}>
      <h1>Welcome to StatWrap</h1>
      <div className={styles.instructions}>
        Welcome to our efficient project management platform. Whether you are initiating a new
        project or revisiting an existing one, our user-friendly interface makes it seamless. Simply
        select a project from the list on the left to access detailed information and kickstart your
        tasks. Experience simplified project management with us, where productivity is just a click
        away.
      </div>
    </div>
  );
};

export default welcome;
