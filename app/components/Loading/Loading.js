import React from 'react';
import LinearProgress from '@mui/material/LinearProgress';
import styles from './Loading.css';

const loading = props => {
  return (
    <div className={styles.container}>
      <LinearProgress />
      <div className={styles.childContainer}>{props.children}</div>
    </div>
  );
};

export default loading;
