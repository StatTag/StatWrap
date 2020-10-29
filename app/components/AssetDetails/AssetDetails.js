import React from 'react';
import Accordion from '@material-ui/core/Accordion';
import AccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import NoteEditor from '../NoteEditor/NoteEditor';
import styles from './AssetDetails.css';

const assetDetails = props => {
  const { asset, onAddedNote, onUpdatedNote } = props;

  console.log(asset);

  const onFinishedEditingNote = (note, text) => {
    if (note) {
      console.log(note);
      console.log(text);
      if (onUpdatedNote) {
        onUpdatedNote(asset, text, note);
      }
    } else {
      // A new note was added
      console.log('New note added');
      if (onAddedNote) {
        onAddedNote(asset, text);
      }
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
          <NoteEditor notes={asset.notes} onEditingComplete={onFinishedEditingNote} />
        </AccordionDetails>
      </Accordion>
    </div>
  );
};

export default assetDetails;
