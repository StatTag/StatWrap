import React from 'react';
import PropTypes from 'prop-types';
import { List, ListItemButton, ListItemText, Chip, IconButton, Tooltip, } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import DeleteIcon from '@mui/icons-material/Delete';

function ProjectTemplateList({ 
  templates, 
  selectedTemplate = null, 
  onSelect, 
  onEdit, 
  onExport, 
  onDelete 
 }) {
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
        <ListItemText 
          primary={
            <span>
            {type.name} 
            {type.isCustom && (
                <Chip
                  label="Custom"
                  size="small"
                  sx={{
                    ml: 1,
                    height: '20px',
                    fontSize: '0.7rem',
                    backgroundColor: '#e8e0f0',
                    color: '#6b5b7b',
                  }}
                />
              )}
            </span>
          }
          secondary={type.description}
          />

          {/* Action icons — only for custom templates */}
        {type.isCustom && (
          <span
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', gap: '2px' }}
          >
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => onEdit && onEdit(type)}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export as ZIP">
              <IconButton
                size="small"
                onClick={() => onExport && onExport(type.id)}
              >
                <FileUploadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => onDelete && onDelete(type)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </span>
        )}

      </ListItemButton>
    ));
  }

  return <List dense>{projectTypeList}</List>;
}

ProjectTemplateList.defaultProps = {
  selectedTemplate: null,
  onEdit: null,
  onExport: null,
  onDelete: null,
};

ProjectTemplateList.propTypes = {
  templates: PropTypes.array.isRequired,
  selectedTemplate: PropTypes.object,
  onSelect: PropTypes.func.isRequired,
  onEdit: PropTypes.func,
  onExport: PropTypes.func,
  onDelete: PropTypes.func,
};

export default ProjectTemplateList;
