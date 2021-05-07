import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Accordion from '@material-ui/core/Accordion';
import MuiAccordionSummary from '@material-ui/core/AccordionSummary';
import AccordionDetails from '@material-ui/core/AccordionDetails';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
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

  console.log(asset);

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
