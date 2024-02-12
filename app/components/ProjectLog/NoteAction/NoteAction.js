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
        <table>
          <tbody>
            <tr>
              <td className={styles.label}>
                <b>Action:</b>
              </td>
              <td>{data.title}</td>
            </tr>
            <tr>
              <td className={styles.label}>
                <b>User:</b>
              </td>
              <td>{data.details.author}</td>
            </tr>
            <tr>
              <td className={styles.label}>
                <b>Note text:</b>
              </td>
              <td className={styles.logDetails}>{data.details.content}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  } else if (data.type === ActionType.NOTE_UPDATED) {
    content = (
      <div className={styles.data}>
        <table>
          <tbody>
            <tr>
              <td className={styles.label}>
                <b>Action:</b>
              </td>
              <td>{data.title}</td>
            </tr>
            <tr>
              <td className={styles.label}>
                <b>User:</b>
              </td>
              <td>{data.details.new.author}</td>
            </tr>
            <tr>
              <td className={styles.label}>
                <b>Old Note text:</b>
              </td>
              <td className={styles.logDetails}>{data.details.old.content}</td>
            </tr>
            <tr>
              <td className={styles.label}>
                <b>New Note text:</b>
              </td>
              <td className={styles.logDetails}>{data.details.new.content}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }
  return <div className={styles.container}>{content}</div>;
};

noteAction.propTypes = {
  data: PropTypes.object.isRequired
};

export default noteAction;
