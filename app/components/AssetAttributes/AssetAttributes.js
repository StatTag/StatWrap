import React, { useState } from 'react';
import { Checkbox, FormControlLabel, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Button, Tooltip, } from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import styles from './AssetAttributes.css';
import AssetsConfig from '../../constants/assets-config';

const assetAttributes = (props) => {
  const { asset, configuration, onUpdateAttribute, customAttributes, onAddCustomAttribute, onDeleteCustomAttribute, } = props;

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newAttributeName, setNewAttributeName] = useState('');

  const updateAttributeValue = (a) => {
    if (onUpdateAttribute) {
      onUpdateAttribute(a.target.name, a.target.checked);
    }
  };

  const handleAddCustomAttribute = () => {
    const trimmedName = newAttributeName.trim();
    if(!trimmedName)return;

    // Enforcing Attributes Name Length
    const safeName = trimmedName.substring(0, AssetsConfig.CUSTOM_ATTRIBUTE_NAME_MAX_LENGTH);
    const id = `custom_${safeName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')}`;
    
    // Checking for the Duplicate IDs
    const allAttributes = [...configuration, ...(customAttributes || [])];
    if (allAttributes.some((a) => a.id === id)) {
      setOpenAddDialog(false);
      setNewAttributeName('');
      return;
    }

    const newAttribute = {
      id,
      display: safeName,
      type: 'bool',
      default: false,
      appliesTo: ['*'],
      source: 'custom',
    }

    if (onAddCustomAttribute) {
      onAddCustomAttribute(newAttribute);
    }

    setOpenAddDialog(false);
    setNewAttributeName('');
  }

  const handleDeleteCustomAttribute = (attributeId) => {
    if (onDeleteCustomAttribute) {
      onDeleteCustomAttribute(attributeId);
    }
  };

  const applicableAttributes = configuration
    .map((a) => {
      // If the asset doesn't have a content type (needed for attribute detection),
      // or the attribute doesn't apply to this asset, skip it
      if (a.appliesTo.includes('*')) {
        return a;
      }
      if (asset.contentTypes == null || !a.appliesTo.some((x) => asset.contentTypes.includes(x))) {
         return null;
      }
      return a;
    })
    .filter((a) => a !== null);

  const allApplicableAttributes = [
    ...applicableAttributes,
    ...(customAttributes || []),
  ];  

  let controls = null;
  if (asset) {
      controls = allApplicableAttributes.map((a) => {
      let control = <span>{a.display}</span>;
      if (a.type === 'bool') {
        const value =
          asset.attributes && asset.attributes[a.id] !== undefined
            ? asset.attributes[a.id]
            : a.default;
        control = (
          <div className={styles.attributeRow}>
          <FormControlLabel
            label={a.display}
            control={
              <Checkbox
                checked={value}
                color="primary"
                size="small"
                name={a.id}
                onChange={updateAttributeValue}
              />
            }
          />
          {a.source === 'custom' && (
            <Tooltip title="Remove this custom attribute" enterDelay={300}>
            <IconButton
              size="small"
              onClick={() => handleDeleteCustomAttribute(a.id)}
              className={styles.deleteButton}
            >
              <Delete fontSize="small" />
            </IconButton>
            </Tooltip>
          )}
          </div>
        );
      }
      return <li key={a.id}>{control}</li>;
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.headerRow}>
        <button
          className={styles.addButton}
          onClick={() => setOpenAddDialog(true)}
        >
          <Add fontSize="small" />
          <span>Add Attribute</span>
        </button>
      </div>
      <ul className={styles.attributesList}>{controls}</ul>

      { /*Custom Attribute Dialog */ }
      <Dialog
        open={openAddDialog}
        onClose={() => {
          setOpenAddDialog(false);
          setNewAttributeName('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle className={styles.dialogTitle}>Custom Attributes</DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <label className={styles.formLabel}>Name of Attributes</label>
          <TextField
            autoFocus
            placeholder='Attributes like "Experimental"'
            value={newAttributeName}
            onChange={(e) => setNewAttributeName(e.target.value)}
            fullWidth
            variant="outlined"
            size="small"
            inputProps={{
              maxLength: AssetsConfig.CUSTOM_ATTRIBUTE_NAME_MAX_LENGTH,
            }}
          />
        </DialogContent>
        <DialogActions className={styles.dialogActions}>
          <button className={styles.saveButton} onClick={handleAddCustomAttribute}>
            Save
          </button>
          <button
            className={styles.cancelButton}
            onClick={() => {
              setOpenAddDialog(false);
              setNewAttributeName('');
            }}
          >
            Cancel
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default assetAttributes;
