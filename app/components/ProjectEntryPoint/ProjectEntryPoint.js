import React from 'react';
import path from 'path';
import { withStyles } from '@mui/styles';
import { Accordion, AccordionDetails, Button, Typography } from '@mui/material';
import MuiAccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileImport, faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import OverflowDiv from '../OverflowDiv/OverflowDiv';
import styles from './ProjectEntryPoint.css';
import AssetUtil from '../../utils/asset';

const AccordionSummary = withStyles({
  root: {
    backgroundColor: 'rgba(0, 0, 0, .03)',
    borderBottom: '1px solid rgba(0, 0, 0, .125)',
    marginBottom: -1,
    minHeight: 32,
    '&$expanded': {
      minHeight: 32,
    },
  },
  content: {
    '&$expanded': {
      margin: '6px 0',
    },
  },
  expanded: {},
})(MuiAccordionSummary);

const projectEntryPoint = (props) => {
  const { assets, rootUri, onSelect } = props;

  const setSelectedAsset = (asset) => {
    const assetDescendantsUri = AssetUtil.findAllDescendantAssetsByUri(
      asset.uri,
      rootUri,
    ).reverse();
    if (onSelect) {
      onSelect(asset, assetDescendantsUri);
    }
  };

  const entryPointsList = AssetUtil.findEntryPointAssets(assets);

  if (entryPointsList && entryPointsList.length > 0) {
    return (
      <div className={styles.container}>
        <OverflowDiv>{rootUri}</OverflowDiv>
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
            aria-controls="entry-points-content"
            id="entry-points-header"
            className={styles.heading}
          >
            <Typography className={styles.headingTitle}>Entry Points ({entryPointsList.length})</Typography>
          </AccordionSummary>
          <AccordionDetails className={styles.details}>
            <ul className={styles.entryPointList} type="disc">
              {entryPointsList.map((asset) => {
                const fileName = asset.uri.split(path.sep).pop();
                let folder = asset.uri.replace(`${rootUri}${path.sep}`, '').split(path.sep)[0];
                if (folder === fileName) {
                  folder = rootUri.split(path.sep).pop();
                }
                return (
                  <li key={asset.uri} className={styles.entryPointItem}>
                    <span className={styles.entryPointUri}>
                      <FontAwesomeIcon icon={faFileImport} /> {fileName} ({folder})
                    </span>
                    <Button className={styles.navButton} onClick={() => setSelectedAsset(asset)}>
                      View &nbsp; <FontAwesomeIcon icon={faShareFromSquare} />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </AccordionDetails>
        </Accordion>
      </div>
    );
  }

  return null;
};

export default projectEntryPoint;
