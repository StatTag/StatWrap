import React, { Component } from 'react';
import People from '../../components/People/People';
import styles from './ConfigurationPage.css';

export default class ConfigurationPage extends Component {
  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h1>Configuration</h1>
        <h2>Directory</h2>
        <People />
      </div>
    );
  }
}
