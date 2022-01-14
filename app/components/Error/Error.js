/* eslint-disable react/prop-types */
import React from 'react';
import ErrorIcon from '@mui/icons-material/Error';
import styles from './Error.css';

const error = props => {
  return (
    <div style={props.style} className={styles.container}>
      <ErrorIcon className={styles.icon} />
      <div className={styles.message}>{props.children}</div>
    </div>
  );
};

export default error;
