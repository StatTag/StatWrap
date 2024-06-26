import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import styles from './ChecklistItem.css';
import NoteEditor from '../NoteEditor/NoteEditor';

function ChecklistItem({ item, project, onUpdatedNote, onDeletedNote, onAddedNote }) {
  const [answer, setAnswer] = useState(item.answer);
  const [notes, setNotes] = useState(item.userNotes || []);

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
    setNotes(item.userNotes || []);
  }, [item.userNotes]);

  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <span>{item.statement}</span>
        <div className={styles.buttoncontainer}>
          <button
            className={answer === 'yes' ? styles.yesset : styles.yes}
            onClick={() => setAnswer('yes')}
          >
            {'Yes'}
          </button>
          <button
            className={answer === 'no' ? styles.noset : styles.no}
            onClick={() => setAnswer('no')}
          >
            {'No'}
          </button>
        </div>
      </div>
      <div className={styles.details}>
        {notes.length > 0 && (
          <div className={styles.notes}>
            <h4>Notes:</h4>
            <ul>
              {notes.map((note) => (
                <li key={note.id}>
                  <strong>{note.author}:</strong> {note.content}
                  <span className={styles.timestamp}>{note.updated}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <NoteEditor
          notes={notes}
          onEditingComplete={handleNoteUpdate}
          onDelete={handleNoteDelete}
        />
        {item.attachedImages.length > 0 && (
          <div className={styles.images}>
            <h4>Attached Images:</h4>
            <ul>
              {item.attachedImages.map((image) => (
                <li key={image.id}>
                  <img src={URL.createObjectURL(image.data)} alt="attached" />
                  <span className={styles.timestamp}>{image.updated}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {item.attachedURLs.length > 0 && (
          <div className={styles.urls}>
            <h4>Attached URLs:</h4>
            <ul>
              {item.attachedURLs.map((url) => (
                <li key={url.id}>
                  <a href={url.hyperlink} target="">
                    {url.hyperlink}
                  </a>
                  <span className={styles.timestamp}>{url.updated}</span>
                </li>
              ))}
            </ul>
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
    answer: PropTypes.string.isRequired,
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
        data: PropTypes.instanceOf(Blob).isRequired,
        updated: PropTypes.string.isRequired,
      })
    ),
    attachedURLs: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        hyperlink: PropTypes.string.isRequired,
        updated: PropTypes.string.isRequired,
      })
    ),
    subChecklists: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string.isRequired,
        statement: PropTypes.string.isRequired,
        type: PropTypes.string.isRequired,
        answer: PropTypes.string.isRequired,
        updated: PropTypes.string.isRequired,
      })
    ),
    updated: PropTypes.string.isRequired,
  }).isRequired,
  project: PropTypes.object.isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

export default ChecklistItem;
