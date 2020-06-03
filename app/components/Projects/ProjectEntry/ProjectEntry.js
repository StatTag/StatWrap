/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import { Tooltip } from '@material-ui/core';
import PortableWifiOffIcon from '@material-ui/icons/PortableWifiOff';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ProjectEntry.css';

const HtmlTooltip = withStyles(theme => ({
  tooltip: {
    backgroundColor: '#f5f5f9',
    color: 'rgba(0, 0, 0, 0.87)',
    maxWidth: 1000,
    fontSize: theme.typography.pxToRem(12),
    border: '1px solid #dadde9'
  }
}))(Tooltip);

const projectEntry = props => {
  const iconClasses = [styles.favoriteIicon];
  if (!props.project.favorite) {
    iconClasses.push(styles.placeholder);
  }

  let offlineIndicator = null;
  let offlineMessage = null;
  if (props.project.loadError) {
    offlineIndicator = <PortableWifiOffIcon className={styles.offlineIcon} fontSize="small" />;
    offlineMessage = <div className={styles.offline}>{offlineIndicator}Project is offline</div>;
  }

  return (
    <HtmlTooltip
      arrow
      enterDelay={500}
      title={
        <>
          <div className={styles.name}>{props.project.name}</div>
          {offlineMessage}
          <div className={styles.tooltipPath}>{props.project.path}</div>
        </>
      }
    >
      <div className={styles.container} data-tid="container">
        <div className={styles.name}>
          <span>
            {props.project.name}
            {offlineIndicator}
          </span>
        </div>
        <div className={styles.path}>{props.project.path}</div>
        <FontAwesomeIcon
          className={iconClasses.join(' ')}
          icon="thumbtack"
          size="xs"
          onClick={props.onFavoriteClick}
        />
      </div>
    </HtmlTooltip>
  );
};

export default projectEntry;
