import React, { Component } from 'react';
import {
  Typography,
  IconButton,
  Button,
  TextField,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import { ipcRenderer } from 'electron';
import { v4 as uuid } from 'uuid';
import Messages from '../../../constants/messages';
import { SettingsContext } from '../../../contexts/Settings';
import styles from './ProjectTemplateSettings.css';

class ProjectTemplateSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isAdding: false,
      editingId: null,
      name: '',
      description: '',
      folders: [],
      currentFolderInput: '',
    };
  }

  handleToggleAdd = () => {
    this.setState((prevState) => ({
      isAdding: !prevState.isAdding,
      editingId: null,
      name: '',
      description: '',
      folders: [],
      currentFolderInput: '',
    }));
  };

  handleCancel = () => {
    this.setState({
      isAdding: false,
      editingId: null,
      name: '',
      description: '',
      folders: [],
      currentFolderInput: '',
    });
  };

  handleEdit = (template) => {
    this.setState({
      isAdding: false,
      editingId: template.id,
      name: template.name,
      description: template.description || '',
      folders: template.folders || [],
      currentFolderInput: '',
    });
  };

  handleDelete = (templateId) => {
    const { settings } = this.context;
    const projectTemplateSettings = { ...settings.projectTemplateSettings };
    projectTemplateSettings.customTemplates = projectTemplateSettings.customTemplates.filter(
      (t) => t.id !== templateId,
    );
    ipcRenderer.send(
      Messages.PROJECT_TEMPLATE_UPDATE_SETTINGS_REQUEST,
      projectTemplateSettings,
    );
  };

  handleSave = () => {
    const { settings } = this.context;
    const projectTemplateSettings = { ...settings.projectTemplateSettings };
    const { editingId, name, description, folders } = this.state;

    if (!name.trim()) return;

    if (editingId) {
      const index = projectTemplateSettings.customTemplates.findIndex(
        (t) => t.id === editingId,
      );
      if (index !== -1) {
        projectTemplateSettings.customTemplates[index] = {
          ...projectTemplateSettings.customTemplates[index],
          name: name.trim(),
          description: description.trim(),
          folders,
        };
      }
    } else {
      projectTemplateSettings.customTemplates.push({
        id: `CUSTOM-${uuid()}`,
        name: name.trim(),
        description: description.trim(),
        folders,
      });
    }

    ipcRenderer.send(
      Messages.PROJECT_TEMPLATE_UPDATE_SETTINGS_REQUEST,
      projectTemplateSettings,
    );

    this.handleCancel();
  };

  handleAddFolder = () => {
    const { currentFolderInput, folders } = this.state;
    if (currentFolderInput.trim() && !folders.includes(currentFolderInput.trim())) {
      this.setState({
        folders: [...folders, currentFolderInput.trim()],
        currentFolderInput: '',
      });
    }
  };

  handleRemoveFolder = (folderToRemove) => {
    this.setState((prevState) => ({
      folders: prevState.folders.filter((f) => f !== folderToRemove),
    }));
  };

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      this.handleAddFolder();
    }
  };

  renderTemplate(template) {
    return (
      <Paper key={template.id} variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {template.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {template.description || 'No description provided.'}
            </Typography>
            <Box mt={1} display="flex" flexWrap="wrap">
              {template.folders.map((folder) => (
                <Chip
                  key={folder}
                  label={folder}
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          </Box>
          <Box>
            <IconButton size="small" onClick={() => this.handleEdit(template)}>
              <EditIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" color="error" onClick={() => this.handleDelete(template.id)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Paper>
    );
  }

  renderForm() {
    const { name, description, folders, currentFolderInput, editingId } = this.state;
    return (
      <Paper variant="outlined" sx={{ p: 2, mt: 2, bgcolor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          {editingId ? 'Edit Project Template' : 'Add New Project Template'}
        </Typography>
        <TextField
          fullWidth
          label="Template Name"
          size="small"
          value={name}
          onChange={(e) => this.setState({ name: e.target.value })}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Description (optional)"
          size="small"
          multiline
          rows={2}
          value={description}
          onChange={(e) => this.setState({ description: e.target.value })}
          sx={{ mb: 2 }}
        />
        <Typography variant="body2" fontWeight="bold" gutterBottom>
          Folders
        </Typography>
        <Box display="flex" gap={1} mb={2}>
          <TextField
            flex={1}
            label="Folder Name"
            size="small"
            value={currentFolderInput}
            onChange={(e) => this.setState({ currentFolderInput: e.target.value })}
            onKeyDown={this.handleKeyDown}
          />
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon />}
            onClick={this.handleAddFolder}
          >
            Add Folder
          </Button>
        </Box>
        <Box display="flex" flexWrap="wrap" mb={2}>
          {folders.map((folder) => (
            <Chip
              key={folder}
              label={folder}
              onDelete={() => this.handleRemoveFolder(folder)}
              size="small"
              sx={{ mr: 0.5, mb: 0.5 }}
            />
          ))}
          {folders.length === 0 && (
            <Typography variant="caption" color="text.secondary">
              No folders added yet.
            </Typography>
          )}
        </Box>
        <Box display="flex" justifyContent="flex-end" gap={1}>
          <Button size="small" onClick={this.handleCancel} startIcon={<CancelIcon />}>
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            color="primary"
            onClick={this.handleSave}
            startIcon={<SaveIcon />}
            disabled={!name.trim()}
          >
            Save Template
          </Button>
        </Box>
      </Paper>
    );
  }

  render() {
    const { settings } = this.context;
    const customTemplates = settings?.projectTemplateSettings?.customTemplates || [];
    const { isAdding, editingId } = this.state;

    return (
      <Accordion defaultExpanded sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Project Templates</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" color="text.secondary" paragraph>
            Define custom folder structures for your new projects.
          </Typography>
          <Box mb={2}>
            {customTemplates.length > 0 ? (
              customTemplates.map((t) => this.renderTemplate(t))
            ) : (
              <Typography variant="body2" color="text.secondary" py={2} textAlign="center">
                No custom templates defined.
              </Typography>
            )}
          </Box>
          {isAdding || editingId ? (
            this.renderForm()
          ) : (
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={this.handleToggleAdd}
            >
              Add New Template
            </Button>
          )}
        </AccordionDetails>
      </Accordion>
    );
  }
}

ProjectTemplateSettings.contextType = SettingsContext;

export default ProjectTemplateSettings;
