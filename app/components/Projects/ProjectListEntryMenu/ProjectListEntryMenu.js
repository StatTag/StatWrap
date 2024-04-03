import React from 'react';
import { Menu, MenuItem } from '@mui/material';
import PropTypes from 'prop-types';
import Messages from '../../../constants/messages';

function projectListEntryMenu(props) {
  return (
    <Menu
      id="project-list-menu"
      anchorEl={props.anchorElement}
      keepMounted
      open={Boolean(props.anchorElement)}
      onClose={props.onClose}
    >
      <MenuItem
        onClick={() =>
          props.onMenuClick(Messages.TOGGLE_PROJECT_FAVORITE_REQUEST, props.project.id)
        }
      >
        {props.project && props.project.favorite ? 'Unpin from Favorites' : 'Pin to Favorites'}
      </MenuItem>
      <MenuItem
        onClick={() =>
          props.onMenuClick(Messages.REMOVE_PROJECT_LIST_ENTRY_REQUEST, props.project.id)
        }
      >
        Remove project entry
      </MenuItem>
    </Menu>
  );
}

projectListEntryMenu.propTypes = {
  anchorElement: PropTypes.object,
  project: PropTypes.object,
  onClose: PropTypes.func.isRequired,
  onMenuClick: PropTypes.func.isRequired,
};

projectListEntryMenu.defaultProps = {
  anchorElement: null,
  project: null,
};

export default projectListEntryMenu;
