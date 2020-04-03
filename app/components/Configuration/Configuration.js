// @flow
import React, { Component } from 'react';
import styles from './Configuration.css';

type Props = {};

export default class Configuration extends Component<Props> {
  props: Props;

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <h2>Configuration</h2>
      </div>
    );
  }
}
