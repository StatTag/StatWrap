/* eslint-disable react/forbid-prop-types */
import React from 'react';
import PropTypes from 'prop-types';
import { List, ListItem, ListItemText } from '@material-ui/core';

function SelectProjectTemplate(props) {
  let projectTypeList = null;
  if (props.templates !== null) {
    projectTypeList = props.templates.map(type => (
      <ListItem
        button
        selected={type.id === props.selectedTemplate}
        key={type.id}
        onClick={() => props.onSelect(type.id)}
      >
        <ListItemText primary={type.name} secondary={type.description} />
      </ListItem>
    ));
  }

  return <List dense>{projectTypeList}</List>;
}

SelectProjectTemplate.defaultProps = {
  selectedTemplate: ''
};

SelectProjectTemplate.propTypes = {
  templates: PropTypes.array.isRequired,
  selectedTemplate: PropTypes.string,
  onSelect: PropTypes.func.isRequired
};

export default SelectProjectTemplate;
