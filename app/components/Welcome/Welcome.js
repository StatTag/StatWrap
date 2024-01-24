import React from 'react';
import AddIcon from '@mui/icons-material/Add';
import styles from './Welcome.css';

const welcome = () => {
  return (
    <div className={styles.container}>
      <h1>Welcome to StatWrap</h1>
      <div className={styles.instructions}>
        <p>
          You can add a new project or load an existing project (click
          <AddIcon className={styles.icon} /> from the Projects list on the left hand side)
        </p>
        <p>Select a project from the list to load its information and start working with it.</p>
      </div>
    </div>
  );
};

export default welcome;
