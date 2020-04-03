// @flow
import React, { Component } from 'react';
import styles from './ProjectList.css';

type Props = {};

export default class ProjectList extends Component<Props> {
  props: Props;

  render() {
    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.title}>{this.props.title}</div>
      </div>
    );
  }
}
