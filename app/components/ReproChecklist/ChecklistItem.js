import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ChecklistItem.css';
import NoteEditor from '../NoteEditor/NoteEditor';
import { AddBox, ContentCopy , Done, Delete} from '@mui/icons-material';
import { IconButton, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { FaFolderOpen, FaFolderMinus, FaChevronUp, FaChevronDown } from 'react-icons/fa';
import AssetTree from '../AssetTree/AssetTree';
import AssetUtil from '../../utils/asset';
import Constants from '../../constants/constants';

const { v4: uuidv4 } = require('uuid');

function ChecklistItem(props) {
  const { item, project, onUpdatedNote, onDeletedNote, onAddedNote, onItemUpdate, onSelectedAsset } = props;

  const treeRef = React.useRef(null);

  const [expanded, setExpanded] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showURLs, setShowURLs] = useState(false);
  const [showSubChecks, setShowSubChecks] = useState(false);
  const [copiedUrlId, setCopiedUrlId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState();
  const [addAsset, setAddAsset] = useState(false);
  const [assetTitle, setAssetTitle] = useState('');
  const [assetDescription, setAssetDescription] = useState('');

  const handleSelectAsset = (selAsset) => {
    let asset = selAsset;
    if (asset && (asset.contentTypes === null || asset.contentTypes === undefined)) {
      if (project && project.assets) {
        asset = AssetUtil.findDescendantAssetByUri(project.assets, asset.uri);
      }
    }

    if (asset && asset.uri) {
      if (asset.type === Constants.AssetType.FILE) {
        const fileName = AssetUtil.getAssetNameFromUri(asset.uri);
        setAssetTitle(fileName);
      } else if (asset.type === Constants.AssetType.URL) {
        setAssetTitle(asset.uri);
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
      console.log("No asset selected - cannot add asset reference");
      return;
    }
    if (!assetTitle) {
      console.log("No title provided - cannot add asset reference");
      return;
    }

    if (selectedAsset.type === Constants.AssetType.FILE) {
      if(selectedAsset.contentTypes.includes(Constants.AssetContentType.IMAGE)) {
        const updatedItem = { ...item, attachedImages: [...item.attachedImages, {id: uuidv4(), uri: selectedAsset.uri, title: assetTitle, description: assetDescription}] };
        onItemUpdate(updatedItem);
        setShowImages(true);
      } else {
        const updatedItem = { ...item, attachedURLs: [...item.attachedURLs, {id: uuidv4(), hyperlink: AssetUtil.absoluteToRelativePath(project.path, selectedAsset), title: assetTitle, description: assetDescription}] };
        onItemUpdate(updatedItem);
        setShowURLs(true);
      }
    } else if (selectedAsset.type === Constants.AssetType.URL) {
      const updatedItem = { ...item, attachedURLs: [...item.attachedURLs, {id: uuidv4(), hyperlink: selectedAsset.uri, title: assetTitle, description: assetDescription}] };
      onItemUpdate(updatedItem);
      setShowURLs(true);
    }

    setAddAsset(false);
  }

  const handleCopy = (urlId, hyperlink) => {
    navigator.clipboard.writeText(hyperlink).then(() => {
      setCopiedUrlId(urlId);
      setTimeout(() => {
        setCopiedUrlId(null);
      }, 3000);
    });
  };

  const handleDeleteUrl = (urlId) => {
    const updatedItem = { ...item, attachedURLs: item.attachedURLs.filter((url) => url.id !== urlId) };
    onItemUpdate(updatedItem);
  };

  const handleDeleteImage = (imageId) => {
    const updatedItem = { ...item, attachedImages: item.attachedImages.filter((image) => image.id !== imageId) };
    onItemUpdate(updatedItem);
  };

  const handleNoteUpdate = (note, text) => {
    if (!text) {
      console.log("Detected an empty new note - this will not be created");
      return;
    }
    if (note) {
      if (onUpdatedNote) {
        onUpdatedNote(project, `Checklist ${item.id}: ` + text, note);
      }
    } else {
      if (onAddedNote) {
        onAddedNote(project, `Checklist ${item.id}: ` + text);
      }
    }
  };

  const handleNoteDelete = (note) => {
    if (onDeletedNote) {
      onDeletedNote(project, note);
    }

    const updatedItem = { ...item, userNotes: item.userNotes.filter((n) => n.id !== note.id) };
    onItemUpdate(updatedItem);
  };

  return (
    <div className={styles.item}>
      <div className={styles.statementHeader}>
        <button className={styles.expandButton}>
          {expanded ? <FaChevronUp className={styles.chevron} onClick={() => setExpanded(false)} /> : <FaChevronDown  className={styles.chevron} onClick={() => setExpanded(true)} />}
        </button>
        <span className={styles.statement}>{item.id}. {item.statement}</span>
        <div className={styles.buttonContainer}>
          <button
            className={item.answer ? styles.yesset : styles.yes}
            onClick={() => {
              const updatedItem = { ...item, answer: true };
              onItemUpdate(updatedItem);
            }}
          >
            {'Yes'}
          </button>
          <button
            className={item.answer  ? styles.no : styles.noset}
            onClick={() => {
              const updatedItem = { ...item, answer: false };
              onItemUpdate(updatedItem);
            }}
          >
            {'No'}
          </button>
        </div>
      </div>
      {expanded && <div className={styles.details}>
        <div className={styles.scanResult}>
          {item.scanResult &&
            Object.keys(item.scanResult).map((key) => {
              return (
              <div key={key}>
                <span className={styles.scanKey}>{key}</span>
                <ul className={styles.scanList}>
                  {item.scanResult[key].length ? (
                    item.scanResult[key].map((answer) => (
                      <li key={answer}>{answer}</li>
                    ))
                  ) : (
                    <li>No answers available</li>
                  )}
                </ul>
              </div>
            )})}
        </div>
        <NoteEditor
          notes={item.userNotes}
          onEditingComplete={handleNoteUpdate}
          onDelete={handleNoteDelete}
        />
        <div>
          <button className={styles.addUrlsButton} onClick={() => setAddAsset(true)}>
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
                assets={project.assets}
                ref={treeRef}
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
            <button onClick={() => setAddAsset(false)} className={styles.cancelButton} autoFocus>
              Cancel
            </button>
          </DialogActions>
        </Dialog>
        {item.attachedURLs.length > 0 && (
          <div className={styles.urls}>
            <div className={styles.headerWithButton}>
              <h4>Attached URLs:</h4>
              <button className={styles.dropdownButton} onClick={() => setShowURLs(!showURLs)}>
                {showURLs ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className={`${styles.urlContent} ${showURLs ? styles.show : ''}`}>
              <ul>
                {item.attachedURLs.map((url) => (
                  <div key={url.id}>
                    <div>
                      <li className={styles.url}>
                        <div className={styles.urlHeader}>
                          <span className={styles.urlText}>{url.title}</span>
                          <div>
                            {copiedUrlId === url.id ? (
                              <Done className={styles.doneButton} />
                            ) : (
                              <ContentCopy
                                className={styles.copyButton}
                                onClick={() => handleCopy(url.id, url.hyperlink)}
                              />
                            )}
                            <Delete
                              className={styles.delButton}
                              onClick={() => handleDeleteUrl(url.id)}
                            />
                          </div>
                        </div>
                        <a href={url.hyperlink} target="">
                          {url.hyperlink}
                        </a>
                        <p>{url.description}</p>
                      </li>
                    </div>
                    <hr />
                  </div>
                ))}
              </ul>
            </div>
          </div>
        )}
        {item.attachedImages.length > 0 && (
          <div className={styles.images}>
            <div className={styles.headerWithButton}>
              <h4>Attached Images:</h4>
              <button className={styles.dropdownButton} onClick={() => setShowImages(!showImages)}>
                {showImages ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className={`${styles.imageContent} ${showImages ? styles.show : ''}`}>
              <ul>
                {item.attachedImages.map((image) => (
                  <li key={image} className={styles.image}>
                    <div className={styles.imageHeader}>
                      <span className={styles.imageText}>{image.title}</span>
                      <Delete
                        className={styles.delButton}
                        onClick={() => handleDeleteImage(image.id)}
                      />
                    </div>
                    <img src={image.uri} alt="attached"/>
                    <p>{image.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {item.subChecklist.length > 0 && (
          <div className={styles.subChecklist}>
            <div className={styles.headerWithButton}>
              <h4>Sub-Checklist:</h4>
              <button className={styles.dropdownButton} onClick={() => setShowSubChecks(!showSubChecks)}>
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
                      <button
                        className={subCheck.answer ? styles.yesset : styles.yes}
                        onClick={() => {
                          const updatedItem = { ...item, subChecklist: item.subChecklist.map((sub) => {
                            if (sub.id === subCheck.id) {
                              return { ...sub, answer: true };
                            }
                            return sub;
                          })};
                          onItemUpdate(updatedItem);
                        }}
                      >
                        {'Yes'}
                      </button>
                      <button
                        className={subCheck.answer ? styles.no : styles.noset}
                        onClick={() => {
                          const updatedItem = { ...item, subChecklist: item.subChecklist.map((sub) => {
                            if (sub.id === subCheck.id) {
                              return { ...sub, answer: false };
                            }
                            return sub;
                          })};
                          onItemUpdate(updatedItem);
                        }}
                      >
                        {'No'}
                      </button>
                    </div>
                  </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>}
    </div>
  );
}

ChecklistItem.propTypes = {
  item: PropTypes.shape({
    id: PropTypes.string.isRequired,
    statement: PropTypes.string.isRequired,
    answer: PropTypes.bool.isRequired,
    scanResult: PropTypes.objectOf(
      PropTypes.arrayOf(PropTypes.string)
    ),
    userNotes: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        author: PropTypes.string.isRequired,
        updated: PropTypes.string.isRequired,
        content: PropTypes.string.isRequired,
      })
    ),
    attachedImages: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        uri: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      })
    ),
    attachedURLs: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        hyperlink: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
      })
    ),
    subChecklist: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        statement: PropTypes.string.isRequired,
        answer: PropTypes.bool.isRequired,
      })
    ),
  }).isRequired,
  project: PropTypes.object.isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

export default ChecklistItem;
