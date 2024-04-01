/* eslint-disable react/prop-types */
import React from 'react';
import AnnouncementOutlinedIcon from '@mui/icons-material/AnnouncementOutlined';
import styles from './ConfigFileInfo.css';

const configFileInfo = (props) => {
  return (
    <div style={props.style} className={styles.container}>
      <AnnouncementOutlinedIcon className={styles.icon} />
      <div className={styles.message}>
        StatWrap will create a directory (.statwrap) in the root of this project folder. This will
        contain configuration information that StatWrap uses, such as project details and activity
        logs.
      </div>
    </div>
  );
};

export default configFileInfo;
