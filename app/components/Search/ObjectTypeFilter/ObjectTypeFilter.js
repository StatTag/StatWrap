import React, { useState } from 'react';
import { Chip } from '@mui/material';
import styles from './ObjectTypeFilter.css';

const objectTypeFilter = (props) => {
  const selectedItemKey = props.selectedType.toLowerCase();
  const filters = props.filters?.map((filter) => {
    const classes = [styles.item];
    if (filter.key == selectedItemKey) {
      classes.push(styles.selected);
    }
    return (
      <div key={filter.key}
        className={classes.join(' ')}
        onClick={() => props.onClick(filter.key, filter.tabIndex)}
      >
        {filter.label}
        <Chip size="small" label={filter.count} />
      </div>
    )
  });

  return (
    <div className={styles.container}>
      {filters}
    </div>
  );
};

export default objectTypeFilter;
