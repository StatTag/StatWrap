import React from 'react';
import PropTypes from 'prop-types';
import { List, ListItemButton, ListItemText } from '@mui/material';

function ProjectTemplateList({ templates, selectedTemplate = null, onSelect }) {
  let projectTypeList = null;
  if (templates !== null) {
    projectTypeList = templates.map((type) => (
      <ListItemButton
        selected={
          (selectedTemplate &&
          type.id === selectedTemplate.id &&
          type.version === selectedTemplate.version)
        }
        key={type.id}
        onClick={() => onSelect(type.id, type.version)}
      >
        <ListItemText primary={type.name} secondary={type.description} />
      </ListItemButton>
    ));
  }

  return <List dense>{projectTypeList}</List>;
}

ProjectTemplateList.propTypes = {
  templates: PropTypes.array.isRequired,
  selectedTemplate: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
};

export default ProjectTemplateList;
