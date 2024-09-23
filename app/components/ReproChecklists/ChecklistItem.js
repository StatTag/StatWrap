import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ChecklistItem.css';
import NoteEditor from '../NoteEditor/NoteEditor';
import { AddBox, ContentCopy , Done, Delete} from '@mui/icons-material';
import Modal from './Modal/Modal';

function ChecklistItem(props) {
  const { item, project, imageAssets, onUpdatedNote, onDeletedNote, onAddedNote, onItemUpdate } = props;
  const [addImages, setAddImages] = useState(false);
  const [addURL, setAddURL] = useState(false);
  const [showImages, setShowImages] = useState(false);
  const [showURLs, setShowURLs] = useState(false);
  const [showSubChecks, setShowSubChecks] = useState(false);
  const [imageModal, setImageModal] = useState({isOpen: false, image: ''});
  const [copiedUrlId, setCopiedUrlId] = useState(null);

  console.log('ChecklistItem Note', item.userNotes);

  const handleSubmitImage = (e) => {
    e.preventDefault();
    const img = {id: Math.random().toString(36).substr(2, 9), uri: imageModal.image, title: e.target.title.value, description: e.target.description.value};
    const updatedItem = { ...item, attachedImages: [...item.attachedImages, img] };
    onItemUpdate(updatedItem);
    setImageModal({isOpen: false, image: ''});
  }

  const handleSubmitUrl = (e) => {
    e.preventDefault();
    const url = {id: Math.random().toString(36).substr(2, 9), hyperlink: e.target.hyperlink.value, title: e.target.title.value, description: e.target.description.value};
    const updatedItem = { ...item, attachedURLs: [...item.attachedURLs, url] };
    onItemUpdate(updatedItem);
    setAddURL(false);
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
    text = `Checklist ${item.id}: ` + text;
    if (note) {
      if (onUpdatedNote) {
        onUpdatedNote(project, text, note);
      }
    } else {
      if (onAddedNote) {
        onAddedNote(project, text);
      }
    }
  };

  const handleNoteDelete = (note) => {
    if (onDeletedNote) {
      onDeletedNote(project, note);
    }
  };

  let imageComponent = null;
  let urlComponent = null;

  imageComponent = <img src={imageModal.image} alt="selected" className={styles.selectedImage}/>;
  urlComponent = (
    <div className={styles.hyperlink}>
      <label htmlFor="hyperlink">URL:</label>
      <input type="text" id="hyperlink" name="hyperlink"/>
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
                  <div>
                    <div>
                      <li key={url.id} className={styles.url}>
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
                    <hr/>
                  </div>
                ))}
              </ul>
            </div>
          </div>
        )}
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
