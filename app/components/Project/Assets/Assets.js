import React, { useState, useEffect } from 'react';
import { IconButton } from '@mui/material';
import { FaPaperclip, FaPlusSquare, FaMinusSquare, FaSave, FaBan } from 'react-icons/fa';
import AssetGroupDialog from '../../../containers/AssetGroupDialog/AssetGroupDialog';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import AssetDetails from '../../AssetDetails/AssetDetails';
import AssetFilter from '../../Filter/Filter';
import Loading from '../../Loading/Loading';
import AssetUtil from '../../../utils/asset';
import GeneralUtil from '../../../utils/general';
import ProjectUtil from '../../../utils/project';
import styles from './Assets.css';

const assetsComponent = props => {
  const {
    project,
    onAddedAssetNote,
    onUpdatedAssetNote,
    onDeletedAssetNote,
    onUpdatedAssetAttribute,
    onSelectedAsset,
    assetAttributes,
    dynamicDetails
  } = props;
  const [selectedAsset, setSelectedAsset] = useState();
  const [assets, setAssets] = useState(null);
  const treeRef = React.useRef(null);
  const [mode, setMode] = useState('default'); // 'default', 'paperclip'
  // This key is part of a trick to get React to throw out and recreate the Asset Group
  // dialog when we have disposed of it - either by creating a project or cancelling.  This
  // tracks a sequential number that, when changed, signals React that the dialog can be
  // recreated. We don't care what this key is, it just has to change.
  const [dialogKey, setDialogKey] = useState(0);
  // UI state flag to let us know when we're in the process of adding/editing a group
  const [editingGroup, setEditingGroup] = useState(false);
  const [groupedAssets, setGroupedAssets] = useState([]);

  const filteredProjectAssets =
    !project || !project.assets ? null : AssetUtil.filterIncludedFileAssets(project.assets);

  // Reset the mode whenever the project is changed
  useEffect(() => {
    setMode('default');
  }, [project]);

  // Because our project property can change, the asset that we have in state as the selected
  // asset may have actually changed.  We need to detect that and refresh the selected asset
  // in that case.
  useEffect(() => {
    // Get a more recent copy of the asset from the updated project
    if (project && project.assets && selectedAsset) {
      const updatedAsset = AssetUtil.findDescendantAssetByUri(project.assets, selectedAsset.uri);
      setSelectedAsset(updatedAsset);
      if (onSelectedAsset) {
        onSelectedAsset(updatedAsset);
      }
    } else {
      setSelectedAsset(null);
      if (onSelectedAsset) {
        onSelectedAsset(null);
      }
    }
  }, [project]);

  useEffect(() => {
    if (project && project.assets) {
      setAssets(AssetUtil.filterIncludedFileAssets(project.assets));
    } else {
      setAssets(null);
    }
  }, [project]);

  // Whenever the filter changes, update the list of assets to include only
  // those that should be displayed.
  const handleFilterChanged = filter => {
    let filteredAssets = ProjectUtil.getFilteredAssets(filteredProjectAssets, filter);
    if (ProjectUtil.isDirectoryFilteredOut(filter)) {
      filteredAssets = ProjectUtil.flattenFilteredAssets(filteredAssets);
    }

    // If filteredAssets ends up becoming null, we are going to set it to an
    // empty object so our UI still displays.
    if (!filteredAssets) {
      filteredAssets = {};
    }

    setAssets(filteredAssets);
  };

  const handleSaveAssetGroup = () => {
    setDialogKey(dialogKey + 1);
    setEditingGroup(true);
    setMode('default');
  };

  const handleCloseAssetGroupDialog = () => {
    setEditingGroup(false);
  };

  const handleSavedAssetGroup = data => {
    console.log(data);
  };

  const handleCheckAsset = (asset, value) => {
    console.log(asset, value);
    setGroupedAssets(prevState => {
      const newAssetGroup = [...prevState];
      GeneralUtil.toggleStringInArray(newAssetGroup, asset, value);
      return newAssetGroup;
    });
  };

  let assetDisplay = null;
  if (project) {
    assetDisplay = <Loading>Please wait for the list of assets to finish loading...</Loading>;
    const assetDetails = selectedAsset ? (
      <AssetDetails
        asset={selectedAsset}
        onAddedNote={onAddedAssetNote}
        onUpdatedNote={onUpdatedAssetNote}
        onDeletedNote={onDeletedAssetNote}
        onUpdatedAttribute={onUpdatedAssetAttribute}
        assetAttributes={assetAttributes}
        sourceControlEnabled={project.sourceControlEnabled}
        dynamicDetails={dynamicDetails}
      />
    ) : null;
    if (assets) {
      let subMenu = null;
      if (mode === 'paperclip') {
        subMenu = (
          <>
            <IconButton
              className={styles.toolbarButton}
              aria-label="save asset group"
              onClick={handleSaveAssetGroup}
            >
              <FaSave fontSize="small" /> &nbsp; Save Asset Group
            </IconButton>
            <IconButton
              className={styles.toolbarButton}
              aria-label="cancel creating asset group"
              onClick={() => setMode('default')}
            >
              <FaBan fontSize="small" /> &nbsp; Cancel
            </IconButton>
          </>
        );
      }

      // Note that for the AssetFilter component, we always want that to be the original
      // full list of assets.  That's why we use project.assets for that component's
      // propery, and the assets state variable for the AssetTree.
      assetDisplay = project.assets.error ? (
        <Error>{assets.errorMessage}</Error>
      ) : (
        <>
          <AssetFilter
            assets={filteredProjectAssets}
            mode="asset"
            onFilterChanged={handleFilterChanged}
          />
          <div className={styles.tree}>
            <div className={styles.toolbar}>
              <IconButton
                onClick={() => treeRef.current.setExpandAll(true)}
                className={styles.toolbarButton}
                aria-label="expand all tree items"
                fontSize="small"
              >
                <FaPlusSquare fontSize="small" /> &nbsp;Expand Assets
              </IconButton>
              <IconButton
                onClick={() => treeRef.current.setExpandAll(false)}
                className={styles.toolbarButton}
                aria-label="collapse all tree items"
                fontSize="small"
              >
                <FaMinusSquare fontSize="small" /> &nbsp;Collapse Assets
              </IconButton>
              <IconButton
                onClick={() => setMode('paperclip')}
                className={styles.toolbarButton}
                disabled={mode === 'paperclip'}
                aria-label="group assets together"
              >
                <FaPaperclip fontSize="small" /> &nbsp; New Asset Group
              </IconButton>
              {subMenu}
            </div>
            <AssetTree
              assets={assets}
              ref={treeRef}
              checkboxes={mode === 'paperclip'}
              onCheckAsset={handleCheckAsset}
              onSelectAsset={asset => {
                setSelectedAsset(asset);
                if (onSelectedAsset) {
                  onSelectedAsset(asset);
                }
              }}
              selectedAsset={selectedAsset}
            />
          </div>
          <div className={styles.details}>{assetDetails}</div>
          <AssetGroupDialog
            key={dialogKey}
            project={project}
            open={editingGroup}
            onClose={handleCloseAssetGroupDialog}
            onSave={handleSavedAssetGroup}
            assets={groupedAssets}
          />
        </>
      );
    }
  }

  return <div className={styles.container}>{assetDisplay}</div>;
};

export default assetsComponent;
