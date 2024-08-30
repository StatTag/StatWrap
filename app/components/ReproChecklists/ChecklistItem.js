import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ChecklistItem.css';
import NoteEditor from '../NoteEditor/NoteEditor';

function ChecklistItem({ item, project, onUpdatedNote, onDeletedNote, onAddedNote }) {
  const [answer, setAnswer] = useState(item.answer);
  const [notes, setNotes] = useState(item.userNotes || []);
  const [showImages, setShowImages] = useState(false);
  const [showURLs, setShowURLs] = useState(false);
  const [allImages, setAllImages] = useState([]);

  const handleNoteUpdate = (note, text) => {
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

  useEffect(() => {
    if (project && Array.isArray(project.assets)) {
      const imageAssets = [];
      const findImageAssets = (asset) => {
        if (asset.type === 'image') {
          imageAssets.push(asset.uri);
        }
        if (asset.children) {
          asset.children.forEach(findImageAssets);
        }
      };

      setAllImages(imageAssets);

      project.assets.forEach(findImageAssets);
    }
  }, [project]);

  useEffect(() => {
    setNotes(item.userNotes || []);
  }, [item.userNotes]);

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span>{item.statement}</span>
        <div className={styles.buttonContainer}>
          <button
            className={answer ? styles.yesset : styles.yes}
            onClick={() => setAnswer(true)}
          >
            {'Yes'}
          </button>
          <button
            className={answer  ? styles.noset : styles.no}
            onClick={() => setAnswer(false)}
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
              <span>{key}</span>
              <ul>
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
          notes={notes}
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
                  <li key={image.id}>
                    <span className={styles.imageTitle}>{image.title}</span>
                    <img src={image.uri} alt="attached" />
                    <p>{image.description}</p>
                    <span className={styles.timestamp}>{image.updated}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
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
                  <li key={url.id}>
                    <span className={styles.urlTitle}>{url.title}</span>
                    <a href={url.hyperlink} target="">
                      {url.hyperlink}
                    </a>
                    <p>{url.description}</p>
                    <span className={styles.timestamp}>{url.updated}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {item.subChecklists.length > 0 && (
          <div className={styles.subChecklists}>
            <h4>Sub-Checklists:</h4>
            {item.subChecklists.map((subItem) => (
              <ChecklistItem
                key={subItem.id}
                item={subItem}
                project={project}
                onUpdatedNote={onUpdatedNote}
                onDeletedNote={onDeletedNote}
                onAddedNote={onAddedNote}
              />
            ))}
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
    type: PropTypes.string.isRequired,
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
        updated: PropTypes.string.isRequired,
      })
    ),
    attachedURLs: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        hyperlink: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string.isRequired,
        updated: PropTypes.string.isRequired,
      })
    ),
    subChecklists: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        statement: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        answer: PropTypes.bool.isRequired,
        scanResult: PropTypes.objectOf(
          PropTypes.arrayOf(PropTypes.string)
        ),
      })
    ),
  }).isRequired,
  project: PropTypes.object.isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

export default ChecklistItem;
