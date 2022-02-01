import React from 'react';
import styles from './SourceControlHistory.css';

const sourceControlHistory = props => {
  const { history } = props;

  let historyControls = null;
  if (history) {
    historyControls = history.map(x => (
      <div key={x.timestamp} className={styles.historyItem}>
        <div className={styles.message}>{x.message}</div>
        <div className={styles.timestamp}>{x.timestamp.toString()}</div>
        <div className={styles.committer}>{x.committer}</div>
      </div>
    ));
  }

  return <div className={styles.container}>{historyControls}</div>;
};

export default sourceControlHistory;
