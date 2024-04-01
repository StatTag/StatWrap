/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { List, ListItem, ListItemText } from '@mui/material';

function ProjectTemplateList(props) {
  let projectTypeList = null;
  if (props.templates !== null) {
    projectTypeList = props.templates.map((type) => (
      <ListItem
        button
        selected={
          props.selectedTemplate &&
          type.id === props.selectedTemplate.id &&
          type.version === props.selectedTemplate.version
        }
        key={type.id}
        onClick={() => props.onSelect(type.id, type.version)}
      >
        <ListItemText primary={type.name} secondary={type.description} />
      </ListItem>
    ));
  }

  return <List dense>{projectTypeList}</List>;
}

ProjectTemplateList.defaultProps = {
  selectedTemplate: null,
};

ProjectTemplateList.propTypes = {
  templates: PropTypes.array.isRequired,
  selectedTemplate: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};

export default ProjectTemplateList;
