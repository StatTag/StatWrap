import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Tooltip } from '@mui/material';
import PortableWifiOffIcon from '@mui/icons-material/PortableWifiOff';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styles from './ProjectEntry.css';

function projectEntry(props) {
  const [isTooltipOpen, setTooltipOpen] = useState(false);

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

  const divClasses = [styles.container];
  if (props.selected) {
    divClasses.push(styles.selected);
  }

  let updateIcon = null;
  if (props.hasUpdate) {
    updateIcon = <FontAwesomeIcon className={styles.updateIcon} icon="bell" />;
  }

  return (
    <div onMouseEnter={() => setTooltipOpen(true)} onMouseLeave={() => setTooltipOpen(false)}>
      <Tooltip
        arrow
        open={isTooltipOpen}
        disableInteractive
        enterDelay={500}
        title={
          <>
            <div className={styles.name}>{props.project.name}</div>
            {offlineMessage}
            <div className={styles.tooltipPath}>{props.project.path}</div>
          </>
        }
      >
        <div className={divClasses.join(' ')} data-tid="container" onClick={props.onSelect}>
          <div className={styles.name}>
            <span>
              {props.project.name}
              {offlineIndicator}
              {updateIcon}
            </span>
          </div>
          <div className={styles.path}>{props.project.path}</div>
          <FontAwesomeIcon
            className={iconClasses.join(' ')}
            icon="thumbtack"
            size="xs"
            onClick={props.onFavoriteClick}
          />
          <FontAwesomeIcon
            className={[styles.placeholder, styles.menuIcon].join(' ')}
            icon="ellipsis-h"
            size="xs"
            onClick={props.onMenuClick}
          />
        </div>
      </Tooltip>
    </div>
  );
}

projectEntry.propTypes = {
  selected: PropTypes.bool,
  hasUpdate: PropTypes.bool,
};

projectEntry.defaultProps = {
  selected: false,
  hasUpdate: false,
};

export default projectEntry;
