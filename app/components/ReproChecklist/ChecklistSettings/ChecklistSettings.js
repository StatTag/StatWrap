import React, { useState, useContext } from 'react';
import { ipcRenderer } from 'electron';
import {
  TextField,
  Paper,
  Typography,
  Box,
  IconButton,
  Collapse,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  SettingsOutlined,
  AddOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  ClearOutlined,
} from '@mui/icons-material';
import { v4 as uuid } from 'uuid';
import SettingsContext from '../../../contexts/Settings';
import Messages from '../../../constants/messages';
import styles from './ChecklistSettings.css';

const ChecklistSettings = () => {
  const { checklistSettings } = useContext(SettingsContext);
  const [showConfig, setShowConfig] = useState(true);
  const [isEditing, setIsEditing] = useState(null); // ID of the item being edited
  const [newItem, setNewItem] = useState({ name: '', statement: '' });
  const [editItem, setEditItem] = useState({ name: '', statement: '' });

  const customItems = checklistSettings ? checklistSettings.customItems : [];

  const handleSaveSettings = (updatedItems) => {
    const updatedSettings = {
      ...checklistSettings,
      customItems: updatedItems,
    };
    ipcRenderer.send(Messages.CHECKLIST_UPDATE_SETTINGS_REQUEST, updatedSettings);
  };

  const handleAddItem = () => {
    if (newItem.name.trim() === '' || newItem.statement.trim() === '') {
      return;
    }
    const updatedItems = [
      ...customItems,
      { id: uuid(), name: newItem.name.trim(), statement: newItem.statement.trim() },
    ];
    handleSaveSettings(updatedItems);
    setNewItem({ name: '', statement: '' });
  };

  const handleDeleteItem = (id) => {
    const updatedItems = customItems.filter((item) => item.id !== id);
    handleSaveSettings(updatedItems);
  };

  const handleStartEdit = (item) => {
    setIsEditing(item.id);
    setEditItem({ name: item.name, statement: item.statement });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setEditItem({ name: '', statement: '' });
  };

  const handleSaveEdit = (id) => {
    if (editItem.name.trim() === '' || editItem.statement.trim() === '') {
      return;
    }
    const updatedItems = customItems.map((item) =>
      item.id === id ? { ...item, name: editItem.name.trim(), statement: editItem.statement.trim() } : item
    );
    handleSaveSettings(updatedItems);
    setIsEditing(null);
    setEditItem({ name: '', statement: '' });
  };

  return (
    <div className={styles.container}>
      <Box mb={2}>
        <Paper variant="outlined" sx={{ backgroundColor: 'background.default' }}>
          <Box
            sx={{
              p: 2,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            onClick={() => setShowConfig(!showConfig)}
          >
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SettingsOutlined />
              Reproducibility Checklist Configuration
            </Typography>
            <IconButton size="small">
              {showConfig ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={showConfig}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Configure additional global questions for the project reproducibility checklist.
                These questions will appear in all projects.
              </Typography>

              <List>
                {customItems.map((item) => (
                  <React.Fragment key={item.id}>
                    <ListItem>
                      {isEditing === item.id ? (
                        <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <TextField
                            fullWidth
                            size="small"
                            label="Item Name"
                            value={editItem.name}
                            onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                          />
                          <TextField
                            fullWidth
                            size="small"
                            label="Checklist Statement"
                            multiline
                            rows={2}
                            value={editItem.statement}
                            onChange={(e) => setEditItem({ ...editItem, statement: e.target.value })}
                          />
                          <Box display="flex" gap={1}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<SaveOutlined />}
                              onClick={() => handleSaveEdit(item.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ClearOutlined />}
                              onClick={handleCancelEdit}
                            >
                              Cancel
                            </Button>
                          </Box>
                        </Box>
                      ) : (
                        <>
                          <ListItemText
                            primary={item.name}
                            secondary={item.statement}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="edit" onClick={() => handleStartEdit(item)}>
                              <EditOutlined />
                            </IconButton>
                            <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteItem(item.id)}>
                              <DeleteOutlined />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </>
                      )}
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>

              <Box sx={{ mt: 3, p: 2, border: '1px dashed #ccc', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Add New Checklist Item
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Item Name (e.g., Funding)"
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  />
                  <TextField
                    fullWidth
                    size="small"
                    label="Checklist Statement (e.g., Funding sources are disclosed)"
                    multiline
                    rows={2}
                    value={newItem.statement}
                    onChange={(e) => setNewItem({ ...newItem, statement: e.target.value })}
                  />
                  <Button
                    variant="contained"
                    startIcon={<AddOutlined />}
                    onClick={handleAddItem}
                    disabled={newItem.name.trim() === '' || newItem.statement.trim() === ''}
                    sx={{ alignSelf: 'flex-start' }}
                  >
                    Add Item
                  </Button>
                </Box>
              </Box>
            </Box>
          </Collapse>
        </Paper>
      </Box>
    </div>
  );
};

export default ChecklistSettings;
