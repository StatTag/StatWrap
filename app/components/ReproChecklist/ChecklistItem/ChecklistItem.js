import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ChecklistItem.css';
import NoteEditor from '../../NoteEditor/NoteEditor';
import { ContentCopy, Done, Delete } from '@mui/icons-material';
import {
  IconButton,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { FaFolderOpen, FaFolderMinus, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import AssetTree from '../../AssetTree/AssetTree';
import AssetUtil from '../../../utils/asset';
import ProjectUtil from '../../../utils/project';
import Constants from '../../../constants/constants';

const { v4: uuidv4 } = require('uuid');

function ChecklistItem(props) {
  const {
    item,
    project,
    onUpdatedNote,
    onDeletedNote,
    onAddedNote,
    onItemUpdate,
    onSelectedAsset,
  } = props;

  const treeRef = React.useRef(null);
  const externalTreeRef = React.useRef(null);

  const filteredProjectAssets = ProjectUtil.filterProjectAssets(project, null);
  const [assets, setAssets] = useState(filteredProjectAssets);
  const [externalAssets, setExternalAssets] = useState(
    project && project.externalAssets
      ? project.externalAssets
      : AssetUtil.createEmptyExternalAssets(),
  );

  const [expanded, setExpanded] = useState(false);

  const [copiedAsset, setCopiedAsset] = useState(null);

  const [showSubChecks, setShowSubChecks] = useState(false);

  const [selectedAsset, setSelectedAsset] = useState(null);
  const [addAsset, setAddAsset] = useState(false);
  const [assetTitle, setAssetTitle] = useState('');
  const [assetDescription, setAssetDescription] = useState('');

  const resetAssetDialog = () => {
    setAddAsset(false);
    setAssetTitle('');
    setAssetDescription('');
    setSelectedAsset(null);
  };

  const handleItemUpdate = (updatedItem, actionType, title, description, details) => {
    onItemUpdate(updatedItem,
      actionType,
      Constants.EntityType.CHECKLIST,
      updatedItem.id,
      title,
      description,
      details
    );
  }

  const formatYesNo = (val) => {
    return val ? "Yes" : "No";
  }

  /**
   * Handler when this checklist item has its value updated.
   *
   * @param {object} event The checkbox event
   */
  const handleItemChecked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.checked;

    // If it didn't change, no action is needed.
    if (newValue === item.value) {
      return;
    }

    const updatedItem = { ...item, answer: newValue };
    handleItemUpdate(updatedItem,
      Constants.ActionType.CHECKLIST_UPDATED,
      Constants.ActionType.CHECKLIST_UPDATED,
      `Set "${updatedItem.statement}" to "${formatYesNo(newValue)}"`,
      {oldValue: formatYesNo(item.Value), newValue: formatYesNo(newValue)}
    );
  };

  /**
   * Handler when a sub-checklist item has its value updated.
   *
   * This is slightly different from the main checklist item update because we need
   * to update the data object differently, and customize the logging message.
   *
   * @param {object} event The checkbox event
   * @param {object} subCheck The sub-checklist item that was updated
   */
  const handleSubItemChecked = (event: React.ChangeEvent<HTMLInputElement>, subCheck) => {
    // TODO: This works in theory... we don't currently have a sub-checklist item, so when we
    // implement one we will need this to be tested more thoroughly.
    const newValue = event.target.checked;
    const updatedItem = {
      ...item,
      subChecklist: item.subChecklist.map((sub) => {
        if (sub.id === subCheck.id) {
          oldAnswer = sub.answer;
          return { ...sub, answer: true };
        }
        return sub;
      }),
    };

    handleItemUpdate(updatedItem,
      Constants.ActionType.CHECKLIST_UPDATED,
      Constants.ActionType.CHECKLIST_UPDATED,
      `Set sub-item ${subCheck.id} of ${updatedItem.statement} to "Yes"`,
      {oldValue: 'No', newValue: 'Yes'}
    );
  };

  const handleSelectAsset = (selAsset) => {
    let asset = selAsset;
    if (asset && (asset.contentTypes === null || asset.contentTypes === undefined)) {
      if (project && project.assets && asset.type === Constants.AssetType.FILE) {
        asset = AssetUtil.findDescendantAssetByUri(project.assets, asset.uri);
      }
    }

    if (asset && asset.uri) {
      if (asset.type === Constants.AssetType.FILE) {
        const fileName = AssetUtil.getAssetNameFromUri(asset.uri);
        setAssetTitle(fileName);
        // Handles case for URL assets
        // TODO: Title is currently the same as URI, some way to get a better title?
      } else if (asset.type === Constants.AssetType.URL) {
        setAssetTitle(asset.name);
      } else {
        setAssetTitle('');
      }
    }

    setSelectedAsset(asset);
    if (onSelectedAsset) {
      onSelectedAsset(asset);
    }
  };

  const handleAddAsset = () => {
    if (!selectedAsset) {
      console.log('No asset selected - cannot add asset reference');
      return;
    }
    if (!assetTitle) {
      console.log('No title provided - cannot add asset reference');
      return;
    }

    // Adds image asset to checklist documentation
    const isImage = (selectedAsset.type === Constants.AssetType.FILE && selectedAsset.contentTypes.includes(Constants.AssetContentType.IMAGE));
    const associatedAsset = {
      uri: selectedAsset.uri,
      name: assetTitle,
      isImage: isImage,
      description: assetDescription,
    };
    const updatedItem = {
      ...item,
      assets: [
        ...item.assets,
        associatedAsset,
      ],
    };
    handleItemUpdate(updatedItem,
      Constants.ActionType.ASSET_ADDED,
      `Checklist Item ${Constants.ActionType.ASSET_ADDED}`,
      `Added a related ${isImage ? 'image' : 'asset'} ${associatedAsset.uri} to checklist item "${updatedItem.statement}"`,
      associatedAsset
    );

    resetAssetDialog();
  };

  const handleCopy = (uri) => {
    // Copy the URL to the clipboard
    navigator.clipboard.writeText(uri).then(() => {
      setCopiedAsset(uri);
      setTimeout(() => {
        setCopiedAsset(null);
      }, 3000);
    });
  };

  const handleDeleteAsset = (uri) => {
    const deletedItem = item.assets.find((asset) => asset.uri === uri);
    if (deletedItem === null || deletedItem === undefined) {
      console.warn(`Unable to delete asset ${uri} - it does not exist in the asset list`);
      return;
    }

    const updatedItem = { ...item, assets: item.assets.filter((asset) => asset.uri !== uri) };
    handleItemUpdate(updatedItem,
      Constants.ActionType.ASSET_DELETED,
      `Checklist Item ${Constants.ActionType.ASSET_DELETED}`,
      `Removed related asset ${deletedItem.uri} from checklist item "${updatedItem.statement}"`,
      deletedItem
    );
  };

  const handleNoteUpdate = (note, text) => {
    if (note) {
      if (onUpdatedNote) {
        onUpdatedNote(item, text, note);
      }
    } else {
      if (onAddedNote) {
        onAddedNote(item, text);
      }
    }
  };

  const handleNoteDelete = (note) => {
    if (onDeletedNote) {
      onDeletedNote(item, note);
    }
  };

  return (
    <div>
      {item && (
        <div className={styles.item}>
          <div className={styles.statementHeader}>
            <button className={styles.expandButton}>
              {expanded ? (
                <FaChevronDown className={styles.chevron} onClick={() => setExpanded(false)} />
              ) : (
                <FaChevronRight className={styles.chevron} onClick={() => setExpanded(true)} />
              )}
            </button>
            <span className={styles.statement}>
              {item.id}. {item.statement}
            </span>
            <div className={styles.buttonContainer}>
              <Checkbox
                checked={item.answer}
                onChange={handleItemChecked}
                sx={{
                  color: '#639',
                  '&.Mui-checked': { color: '#639' },
                }}
              />
            </div>
          </div>
          {expanded && (
            <div className={styles.details}>
              <div className={styles.scanResult}>
                {item.scanResult &&
                  Object.keys(item.scanResult).map((key) => {
                    return (
                      <div key={key}>
                        <span className={styles.scanKey}>{key}</span>
                        <ul className={styles.scanList}>
                          {item.scanResult[key].length ? (
                            item.scanResult[key].map((answer, index) => (
                              <li key={index}>{answer}</li>
                            ))
                          ) : (
                            <li>No answers available</li>
                          )}
                        </ul>
                      </div>
                    );
                  })}
              </div>
              <NoteEditor
                notes={item.notes}
                onEditingComplete={handleNoteUpdate}
                onDelete={handleNoteDelete}
              />
              <div>
                <button className={styles.addAssetButton} onClick={() => setAddAsset(true)}>
                  Add Asset Reference
                </button>
              </div>
              <Dialog open={addAsset} onClose={() => setAddAsset(false)}>
                <DialogTitle className={styles.dialogTitle}>Add Asset Reference</DialogTitle>
                <DialogContent className={styles.dialogContent}>
                  <div className={styles.tree}>
                    <div className={styles.toolbar}>
                      <IconButton
                        onClick={() => treeRef.current.setExpandAll(true)}
                        className={styles.toolbarButton}
                        aria-label="expand all tree items"
                        fontSize="small"
                      >
                        <FaFolderOpen fontSize="small" /> &nbsp;Expand
                      </IconButton>
                      <IconButton
                        className={styles.toolbarButton}
                        aria-label="collapse all tree items"
                        fontSize="small"
                        onClick={() => treeRef.current.setExpandAll(false)}
                      >
                        <FaFolderMinus fontSize="small" /> &nbsp;Collapse
                      </IconButton>
                    </div>
                    <AssetTree
                      assets={assets}
                      ref={treeRef}
                      onSelectAsset={handleSelectAsset}
                      selectedAsset={selectedAsset}
                    />
                    <AssetTree
                      assets={externalAssets}
                      ref={externalTreeRef}
                      onSelectAsset={handleSelectAsset}
                      selectedAsset={selectedAsset}
                    />
                  </div>
                  <div className={styles.form}>
                    <div className={styles.title}>
                      <label htmlFor="title">Title:</label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={assetTitle}
                        onChange={(e) => setAssetTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.description}>
                      <label htmlFor="description">Description:</label>
                      <input
                        id="description"
                        name="description"
                        value={assetDescription}
                        onChange={(e) => setAssetDescription(e.target.value)}
                      />
                    </div>
                  </div>
                </DialogContent>
                <DialogActions>
                  <button onClick={() => handleAddAsset()} className={styles.submitButton}>
                    Add
                  </button>
                  <button
                    onClick={() => resetAssetDialog()}
                    className={styles.cancelButton}
                    autoFocus
                  >
                    Cancel
                  </button>
                </DialogActions>
              </Dialog>
              {item.assets && item.assets.length > 0 && (
                <div className={styles.assets}>
                  <div className={styles.assetContent}>
                    <table className={styles.assets}>
                      <tbody>
                      {item.assets.map((asset) => (
                        <tr key={asset.uri}>
                          <td className={styles.detailsCol}>
                            <div className={styles.assetName}>{asset.name}</div>
                            <div className={styles.assetDescription}><b>Description: </b>{asset.description}</div>
                            <div className={styles.assetLink}>
                              <b>Link: </b>
                              <a href={asset.uri} target="">
                                {asset.uri}
                              </a>
                            </div>
                          </td>
                          <td className={styles.imageCol}>
                            {asset.isImage ? (
                            <img src={asset.uri} alt="attached" />
                            ) : (<div/>)
                            }
                          </td>
                          <td className={styles.actionCol}>
                            {copiedAsset === asset.uri ? (
                              <Done className={styles.doneButton} />
                            ) : (
                              <ContentCopy
                                className={styles.copyButton}
                                onClick={() => handleCopy(asset.uri)}
                              />
                            )}
                            <Delete
                              className={styles.delButton}
                              onClick={() => handleDeleteAsset(asset.uri)}
                            />
                          </td>
                        </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {item.subChecklist.length > 0 && (
                <div className={styles.subChecklist}>
                  <div className={styles.headerWithButton}>
                    <h4>Sub-Checklist:</h4>
                    <button
                      className={styles.dropdownButton}
                      onClick={() => setShowSubChecks(!showSubChecks)}
                    >
                      {showSubChecks ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className={`${styles.subChecksContent} ${showSubChecks ? styles.show : ''}`}>
                    <ul>
                      {item.subChecklist.map((subCheck) => (
                        <li key={subCheck.id}>
                          <div className={styles.header}>
                            <span>{subCheck.statement}</span>
                            <div className={styles.buttonContainer}>
                              <Checkbox
                                checked={subCheck.answer}
                                onChange={(e) => handleSubItemChecked(e, subCheck)}
                                sx={{ color: '#639', '&.Mui-checked': { color: '#639' } }}
                              />
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

ChecklistItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.number.isRequired,
    name: PropTypes.string.isRequired,
    statement: PropTypes.string.isRequired,
    answer: PropTypes.bool.isRequired,
    scanResult: PropTypes.objectOf(PropTypes.arrayOf(PropTypes.string)),
    notes: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        author: PropTypes.string.isRequired,
        updated: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
      }),
    ),
    asssets: PropTypes.arrayOf(
      PropTypes.shape({
        uri: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired,
        isImage: PropTypes.bool.isRequired,
        description: PropTypes.string.isRequired,
      }),
    ),
    subChecklist: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        statement: PropTypes.string.isRequired,
        answer: PropTypes.bool.isRequired,
      }),
    ),
  }).isRequired,
  project: PropTypes.object.isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
  onItemUpdate: PropTypes.func.isRequired,
  onSelectedAsset: PropTypes.func.isRequired,
};

export default ChecklistItem;
