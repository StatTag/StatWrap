import React, { useEffect, useState } from 'react';
import { FaTrash, FaEdit } from 'react-icons/fa';
import { IconButton } from '@mui/material';
import OverflowDiv from '../OverflowDiv/OverflowDiv';
import Constants from '../../constants/constants';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AssetAttributes from '../AssetAttributes/AssetAttributes';
import NoteEditor from '../NoteEditor/NoteEditor';
import Loading from '../Loading/Loading';
import SourceControlHistory from '../SourceControlHistory/SourceControlHistory';
import styles from './AssetDetails.css';
import { styled } from '@mui/material/styles';

const CustomAccordionSummary = styled(AccordionSummary)(({ theme }) => ({
  backgroundColor: 'rgba(0, 0, 0, .03)',
  borderBottom: '1px solid rgba(0, 0, 0, .125)',
  marginBottom: -1,
  minHeight: 32,
  '&.Mui-expanded': {
    minHeight: 32,
  },
  '.MuiAccordionSummary-content.Mui-expanded': {
    margin: '6px 0',
  },
}));

const assetDetails = (props) => {
  const {
    asset,
    onEdit,
    onRemove,
    onAddedNote,
    onUpdatedNote,
    onDeletedNote,
    onUpdatedAttribute,
    assetAttributes,
    sourceControlEnabled,
    dynamicDetails,
  } = props;

  const [expandNotes, setExpandNotes] = useState(false);
  const [notesLabel, setNotesLabel] = useState('Notes (0)');

  useEffect(() => {
    if (asset && asset.notes) {
      setNotesLabel(`Notes (${asset.notes.length})`);
      setExpandNotes(asset.notes.length > 0);
    } else {
      setNotesLabel(`Notes (0)`);
      setExpandNotes(false);
    }
  }, [asset]);

  const clickNotesAccordionHandler = () => {
    setExpandNotes((prevState) => !prevState);
  };

  const updatedNoteHandler = (note, text) => {
    if (note) {
      if (onUpdatedNote) {
        onUpdatedNote(asset, text, note);
      }
    } else if (onAddedNote) {
      onAddedNote(asset, text);
    }
  };

  const deleteNoteHandler = (note) => {
    if (onDeletedNote) {
      onDeletedNote(asset, note);
    }
  };

  const updateAssetAttribute = (name, value) => {
    if (onUpdatedAttribute) {
      onUpdatedAttribute(asset, name, value);
    }
  };

  const deleteHandler = () => {
    if (onRemove) {
      onRemove(asset);
    }
  };

  const editHandler = () => {
    if (onEdit) {
      onEdit(asset);
    }
  };

  const isExternalAsset = asset && asset.type === Constants.AssetType.URL;

  let sourceControlAccordion = null;
  if (!isExternalAsset && sourceControlEnabled) {
    let dynamicDetailsContainer = <Loading>Please wait while file history loads...</Loading>;
    if (dynamicDetails) {
      dynamicDetailsContainer = <SourceControlHistory history={dynamicDetails.sourceControl} />;
    }
    sourceControlAccordion = (
      <Accordion>
        <CustomAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="source-control-content"
          id="source-control-header"
        >
          <Typography className={styles.headingTitle}>Source Control</Typography>
        </CustomAccordionSummary>
        <AccordionDetails className={styles.details}>{dynamicDetailsContainer}</AccordionDetails>
      </Accordion>
    );
  }

  let attributesAccordion = null;
  if (!isExternalAsset) {
    attributesAccordion = (
      <Accordion defaultExpanded>
        <CustomAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="attributes-content"
          id="attributes-header"
        >
          <Typography className={styles.headingTitle}>Attributes</Typography>
        </CustomAccordionSummary>
        <AccordionDetails className={styles.details}>
          <AssetAttributes
            asset={asset}
            configuration={assetAttributes}
            onUpdateAttribute={updateAssetAttribute}
          />
        </AccordionDetails>
      </Accordion>
    );
  }

  let actions = null;
  if (isExternalAsset) {
    actions = (
      <div className={styles.actions}>
        <IconButton onClick={editHandler} aria-label="edit" className={styles.action}>
          <FaEdit fontSize="small" /> Edit Resource
        </IconButton>
        <IconButton onClick={deleteHandler} aria-label="delete" className={styles.action}>
          <FaTrash fontSize="small" /> Remove Resource
        </IconButton>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <OverflowDiv>{asset.uri}</OverflowDiv>
      {actions}
      <Accordion expanded={expandNotes}>
        <CustomAccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="notes-content"
          id="notes-header"
          onClick={clickNotesAccordionHandler}
        >
          <Typography className={styles.headingTitle}>{notesLabel}</Typography>
        </CustomAccordionSummary>
        <AccordionDetails className={styles.details}>
          <NoteEditor
            notes={asset.notes}
            onDelete={deleteNoteHandler}
            onEditingComplete={updatedNoteHandler}
          />
        </AccordionDetails>
      </Accordion>
      {attributesAccordion}
      {sourceControlAccordion}
    </div>
  );
};

export default assetDetails;
