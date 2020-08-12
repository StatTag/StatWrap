import React from 'react';
import styles from './Welcome.css';

const welcome = () => {
  return (
    <div className={styles.container}>
      <h1>Welcome to StatWrap</h1>
      <div className={styles.instructions}>
        You can add a new project or load an existing project using the Projects list on the left
        hand side. Select a project to load its information and start working with it. This text is
        awful, I know. We&apos;ll come up with something better.
      </div>
    </div>
  );
};

export default welcome;
