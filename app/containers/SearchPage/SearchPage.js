import React, { Component } from 'react';
import Search from '../../components/Search/Search';
import styles from './Search.css';

export default class SearchPage extends Component {
  render() {
    return (
      <div className={styles.container} data-tid="container">
        <Search />
      </div>
    );
  }
}
