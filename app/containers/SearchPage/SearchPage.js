import React from 'react';
import Search from '../../components/Search/Search';
import styles from './Search.css';

export default function SearchPage() {
  return (
    <div className={styles.container} data-tid="container">
      <Search />
    </div>
  );
}