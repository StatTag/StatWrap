import React from 'react';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import NoteEditor from '../NoteEditor/NoteEditor';
import styles from './AssetDetails.css';

const assetDetails = props => {
  const { asset, onAddedNote, onUpdatedNote, onDeletedNote } = props;
  const updatedNoteHandler = (note, text) => {
    if (note) {
      if (onUpdatedNote) {
        onUpdatedNote(asset, text, note);
      }
    } else if (onAddedNote) {
      onAddedNote(asset, text);
    }
  };

  const deleteNoteHandler = note => {
    if (onDeletedNote) {
      onDeletedNote(asset, note);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.title}>{asset.uri}</div>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="notes-content"
          id="notes-header"
          className={styles.heading}
        >
          <Typography className={styles.headingTitle}>Notes</Typography>
        </AccordionSummary>
        <AccordionDetails className={styles.details}>
          <NoteEditor
            notes={asset.notes}
            onDelete={deleteNoteHandler}
            onEditingComplete={updatedNoteHandler}
          />
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default assetDetails;
