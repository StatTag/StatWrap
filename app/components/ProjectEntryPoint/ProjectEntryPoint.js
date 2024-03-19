import React from 'react';
import styles from './ProjectEntryPoint.css';
import { Button, Typography } from "@mui/material";


function findEntryPoints(asset, entryPointsList) {
  if (asset.attributes && asset.attributes.entrypoint === true) {
    entryPointsList.push(asset);
  }
  if (asset.children) {
    asset.children.forEach((child) => {
      findEntryPoints(child, entryPointsList);
    });
  }
}

function findAllDescendantAssetsByUri(asseturi, uri) {
  const descendantsList = [];
  descendantsList.push(asseturi); // Add the asset uri to the list
  let updatedAssetUri = asseturi; // Create a new variable to store the updated value
  // just loop through the asset uri and break it apart at each '/' and add to the list till we get to the end
  while (updatedAssetUri !== uri) {
    const lastSlash = updatedAssetUri.lastIndexOf('/');
    if (lastSlash === -1) {
      break;
    }
    updatedAssetUri = updatedAssetUri.substring(0, lastSlash); // Update the new variable instead of modifying the function parameter directly
    descendantsList.push(updatedAssetUri);
  }
  return descendantsList;
}

const projectEntryPoint = (props) => {
  const { assets, rooturi, onSelect } = props;

  const setSelectedAsset = (asset) => {
    const assetDescendantsUri = findAllDescendantAssetsByUri(asset.uri, rooturi).reverse();
    if (onSelect) {
      onSelect(asset, assetDescendantsUri);
    }
  };
  const entryPointsList = [];
  if (assets) {
    findEntryPoints(assets, entryPointsList);
  }

  if (entryPointsList && entryPointsList.length > 0) {
    return (
      <div className={styles.container}>
        <Typography variant="h6">Entry Points</Typography>
        <ol className={styles.entryPointList} type='1'>
          {entryPointsList.map((asset) => {
            return (
              <li key={asset.id} className={styles.entryPointItem}>
                <div>
                  <Typography className={styles.entryPointUri}>{asset.uri}</Typography>
                  <Button onClick={() => setSelectedAsset(asset)}>Navigate here.</Button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    );
  }

  return null;
};

export default projectEntryPoint;
