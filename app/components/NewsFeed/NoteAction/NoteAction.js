/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { ActionType } from '../../../constants/constants';
import styles from './NoteAction.css';

const noteAction = props => {
  const { data } = props;
  let content = null;
  if (data.type === ActionType.NOTE_ADDED || data.type === ActionType.NOTE_DELETED) {
    content = (
      <div className={styles.data}>
        <div>
          <b>Action:</b> {data.type}
        </div>
        <div>
          <b>User:</b> {data.details.author}
        </div>
        <div>
          <b>Note text:</b> {data.details.content}
        </div>
      </div>
    );
  } else if (data.type === ActionType.NOTE_UPDATED) {
    content = (
      <div className={styles.data}>
        <div>
          <b>Action:</b> {data.type}
        </div>
        <div>
          <b>User:</b> {data.details.new.author}
        </div>
        <div>
          <b>Old Note text:</b> {data.details.old.content}
        </div>
        <div>
          <b>New Note text:</b> {data.details.new.content}
        </div>
      </div>
    );
  }
  return <div className={styles.container}>{content}</div>;
};

noteAction.propTypes = {
  data: PropTypes.object.isRequired
};

export default noteAction;
