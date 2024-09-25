import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ChecklistItem.css';
import NoteEditor from '../NoteEditor/NoteEditor';
import { AddBox, ContentCopy , Done, Delete} from '@mui/icons-material';
import { Box, IconButton, Tabs, Tab } from '@mui/material';
import { TabContext, TabPanel } from '@mui/lab';
import { FaFolderOpen, FaFolderMinus, FaPlusSquare } from 'react-icons/fa';
import Modal from './Modal/Modal';
import AssetTree from '../AssetTree/AssetTree';
import AssetUtil from '../../utils/asset';

const { v4: uuidv4 } = require('uuid');

function ChecklistItem(props) {
  const { item, project, imageAssets, onUpdatedNote, onDeletedNote, onAddedNote, onItemUpdate, onSelectedAsset } = props;

  const treeRef = React.useRef(null);

  const [addImages, setAddImages] = useState(false);
  const [addURL, setAddURL] = useState(false);
  const [addFile, setAddFile] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showURLs, setShowURLs] = useState(false);
  const [showSubChecks, setShowSubChecks] = useState(false);
  const [imageModal, setImageModal] = useState({isOpen: false, image: ''});
  const [copiedUrlId, setCopiedUrlId] = useState(null);
  const [selectedTab, setSelectedTab] = useState('urls');
  const [selectedAsset, setSelectedAsset] = useState();

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleSelectAsset = (selAsset) => {
    let asset = selAsset;
    if (asset && (asset.contentTypes === null || asset.contentTypes === undefined)) {
      if (project && project.assets) {
        asset = AssetUtil.findDescendantAssetByUri(project.assets, asset.uri);
      }
    }

    setSelectedAsset(asset);
    if (onSelectedAsset) {
      onSelectedAsset(asset);
    }
  };

  const handleSubmitImage = (e) => {
    e.preventDefault();
    const img = {id: uuidv4(), uri: imageModal.image, title: e.target.title.value, description: e.target.description.value};
    const updatedItem = { ...item, attachedImages: [...item.attachedImages, img] };
    onItemUpdate(updatedItem);
    setImageModal({isOpen: false, image: ''});
    setShowImages(true);
  }

  const handleSubmitUrl = (e) => {
    e.preventDefault();
    const url = {id: uuidv4(), hyperlink: e.target.hyperlink.value, title: e.target.title.value, description: e.target.description.value};
    const updatedItem = { ...item, attachedURLs: [...item.attachedURLs, url] };
    onItemUpdate(updatedItem);
    setAddURL(false);
    setAddFile(false);
    setShowURLs(true);
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

  let imageComponent = null;
  let urlComponent = null;
  let fileComponent = null;

  imageComponent = <img src={imageModal.image} alt="selected" className={styles.selectedImage}/>;
  urlComponent = (
    <div className={styles.hyperlink}>
      <label htmlFor="hyperlink">URL:</label>
      <input type="url" id="hyperlink" name="hyperlink" required/>
    </div>
  )
  fileComponent = (
    <div className={styles.hyperlink}>
      <label htmlFor="hyperlink">File Path:</label>
      <input type="text" id="hyperlink" name="hyperlink" value={selectedAsset&&selectedAsset.uri} required/>
    </div>
  )

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span className={styles.statement}>{item.statement}</span>
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
      <div className={styles.details}>
        <NoteEditor
          notes={item.userNotes}
          onEditingComplete={handleNoteUpdate}
          onDelete={handleNoteDelete}
        />
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
        {imageAssets.length > 0 && (
          <div className={styles.images}>
            <button className={styles.addImagesButton} onClick={() => setAddImages(!addImages)}>
              Add Images
            </button>
            <div className={`${styles.imageContent} ${addImages ? styles.show : ''}`}>
              <ul>
                {imageAssets.map((image) => (
                  <li key={image} className={styles.header}>
                    <AddBox className={styles.addIcon}  onClick={()=> setImageModal({isOpen: true, image: image})}/>
                    <img src={image} alt="project image" />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <Modal
          isOpen={imageModal.isOpen}
          onClose={()=>setImageModal({isOpen: false, image: ''})}
          onSubmit={handleSubmitImage}
          title="Image"
          component={imageComponent}
        />
        <TabContext value={selectedTab}>
          <Tabs value={selectedTab} onChange={handleTabChange} aria-label="tabs">
            <Tab label="Assets" value="assets" />
            <Tab label="URLs" value="urls" />
          </Tabs>
          <TabPanel value="assets" style={{paddingTop : '5px', paddingLeft : '5px', paddingBottom : '5px'}}>
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
                  onClick={() => treeRef.current.setExpandAll(false)}
                  className={styles.toolbarButton}
                  aria-label="collapse all tree items"
                  fontSize="small"
                >
                  <FaFolderMinus fontSize="small" /> &nbsp;Collapse
                </IconButton>
                <IconButton
                  onClick={() => setAddFile(true)}
                  className={styles.toolbarButton}
                  aria-label="add selected asset"
                  fontSize="small"
                >
                  <FaPlusSquare fontSize="small" /> &nbsp;Add Selected Asset
                </IconButton>
              </div>
              <AssetTree
                assets={project.assets}
                ref={treeRef}
                onSelectAsset={handleSelectAsset}
                selectedAsset={selectedAsset}
              />
            </div>
          </TabPanel>
          <TabPanel value="urls" style={{paddingTop : '5px', paddingLeft : '15px', paddingBottom : '5px'}}>
            {item.attachedURLs.length > 0 ? (
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
            ) : (
              <p>No URLs attached.</p>
            )}
          </TabPanel>
        </TabContext>
        <Modal
          isOpen={addFile}
          onClose={()=>setAddFile(false)}
          onSubmit={handleSubmitUrl}
          title="URL"
          component={fileComponent}
        />
        <div>
          <button className={styles.addUrlsButton} onClick={() => setAddURL(true)}>
            Add URLs
          </button>
        </div>
        <Modal
          isOpen={addURL}
          onClose={()=>setAddURL(false)}
          onSubmit={handleSubmitUrl}
          title="URL"
          component={urlComponent}
        />
        {item.subChecklists.length > 0 && (
          <div className={styles.subChecklists}>
            <div className={styles.headerWithButton}>
              <h4>Sub-Checklists:</h4>
              <button className={styles.dropdownButton} onClick={() => setShowSubChecks(!showSubChecks)}>
                {showSubChecks ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className={`${styles.subChecksContent} ${showSubChecks ? styles.show : ''}`}>
              <ul>
                {item.subChecklists.map((subCheck) => (
                  <li key={subCheck.id}>
                  <div className={styles.header}>
                    <span>{subCheck.statement}</span>
                    <div className={styles.buttonContainer}>
                      <button
                        className={subCheck.answer ? styles.yesset : styles.yes}
                        onClick={() => {
                          const updatedItem = { ...item, subChecklists: item.subChecklists.map((sub) => {
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
                          const updatedItem = { ...item, subChecklists: item.subChecklists.map((sub) => {
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
      </div>
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
    subChecklists: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        statement: PropTypes.string.isRequired,
        answer: PropTypes.bool.isRequired,
      })
    ),
  }).isRequired,
  project: PropTypes.object.isRequired,
  imageAssets: PropTypes.arrayOf(PropTypes.string),
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

export default ChecklistItem;
