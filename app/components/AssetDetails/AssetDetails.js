import React from 'react';
import { withStyles } from '@mui/styles';
import Accordion from '@mui/material/Accordion';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssetAttributes from '../AssetAttributes/AssetAttributes';
import NoteEditor from '../NoteEditor/NoteEditor';
import styles from './AssetDetails.css';

const AccordionSummary = withStyles({
  root: {
    backgroundColor: 'rgba(0, 0, 0, .03)',
    borderBottom: '1px solid rgba(0, 0, 0, .125)',
    marginBottom: -1,
    minHeight: 32,
    '&$expanded': {
      minHeight: 32
    }
  },
  content: {
    '&$expanded': {
      margin: '6px 0'
    }
  },
  expanded: {}
})(MuiAccordionSummary);

const assetDetails = props => {
  const {
    asset,
    onAddedNote,
    onUpdatedNote,
    onDeletedNote,
    onUpdatedAttribute,
    assetAttributes
  } = props;
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

  const updateAssetAttribute = (name, value) => {
    if (onUpdatedAttribute) {
      onUpdatedAttribute(asset, name, value);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.title}>{asset.uri}</div>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="notes-attributes"
          id="attributes-header"
          className={styles.heading}
        >
          <Typography className={styles.headingTitle}>Attributes</Typography>
        </AccordionSummary>
        <AccordionDetails className={styles.details}>
          <AssetAttributes
            asset={asset}
            configuration={assetAttributes}
            onUpdateAttribute={updateAssetAttribute}
          />
        </AccordionDetails>
      </Accordion>
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
