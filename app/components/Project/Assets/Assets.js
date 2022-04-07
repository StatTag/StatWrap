import React, { useState, useEffect } from 'react';
import { IconButton } from '@mui/material';
import { FaPlusSquare, FaSave, FaBan, FaFolderOpen, FaFolderMinus } from 'react-icons/fa';
import { cloneDeep } from 'lodash';
import AssetGroupDialog from '../../../containers/AssetGroupDialog/AssetGroupDialog';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import AssetDetails from '../../AssetDetails/AssetDetails';
import AssetFilter from '../../Filter/Filter';
import EditableSelect from '../../EditableSelect/EditableSelect';
import Loading from '../../Loading/Loading';
import AssetUtil from '../../../utils/asset';
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
    onAddedAssetGroup,
    onUpdatedAssetGroup,
    onDeletedAssetGroup,
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
  const [currentAssetGroup, setCurrentAssetGroup] = useState(null);

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

  // When the user triggers saving an Asset Group, update the UI so the dialog
  // appears to enter the asset group details.
  const handleStartSaveAssetGroup = () => {
    setDialogKey(dialogKey + 1);
    setEditingGroup(true);
    setMode('default');
  };

  const handleCloseAssetGroupDialog = () => {
    setEditingGroup(false);
  };

  const handleSavedAssetGroup = group => {
    if (group.id === null || group.id === undefined) {
      if (onAddedAssetGroup) {
        onAddedAssetGroup(group);
      }
    } else if (onUpdatedAssetGroup) {
      onUpdatedAssetGroup(group);
    }
    setEditingGroup(false);
  };

  // When the user selects a checkbox next to an asset - initially used just for building
  // asset groups, but consider if it could be more broadly repurposed.
  const handleCheckAsset = (asset, value) => {
    setGroupedAssets(prevState => {
      const newAssetGroup = [...prevState];
      const index = newAssetGroup.findIndex(x => x.uri === asset.uri);
      // We only need to consider adding and removing - there are other branches of logic
      // that are essentialy noops.
      if (index === -1 && value) {
        // Add it to the array if it's not there and we need it added.  Note we are only pulling
        // over a subset of the fields - the minimum needed for managing the group.
        newAssetGroup.push({ uri: asset.uri, type: asset.type });
      } else if (index > -1 && !value) {
        // Remove it from the array if it's there and we don't want it
        newAssetGroup.splice(index, 1);
      }
      return newAssetGroup;
    });
  };

  const handleSelectAssetGroup = group => {
    setCurrentAssetGroup(cloneDeep(group));
  };

  const handleEditAssetGroup = group => {
    const clonedGroup = cloneDeep(group);
    setCurrentAssetGroup(clonedGroup);
    treeRef.current.setPreCheckedNodes(clonedGroup.assets.map(x => x.uri));
    setMode('paperclip');
  };

  const handleDeleteAssetGroup = group => {
    // If we just deleted the selected asset group, clear the selection
    if (currentAssetGroup && currentAssetGroup.id === group.id) {
      setCurrentAssetGroup(null);
    }

    if (onDeletedAssetGroup) {
      onDeletedAssetGroup(group);
    }
  };

  const handleStartAssetGroupMode = () => {
    setCurrentAssetGroup(null);
    treeRef.current.setPreCheckedNodes([]);
    setMode('paperclip');
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
          <div className={styles.toolbar}>
            <IconButton
              className={styles.toolbarButton}
              aria-label="save asset group"
              onClick={handleStartSaveAssetGroup}
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
          </div>
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
                <FaFolderOpen fontSize="small" /> &nbsp;Expand
              </IconButton>
              <IconButton
                onClick={() => treeRef.current.setExpandAll(false)}
                className={styles.toolbarButton}
                aria-label="collapse all tree items"
                fontSize="small"
              >
                <FaFolderMinus fontSize="small" /> &nbsp;Collapse
              </IconButton>
              <IconButton
                onClick={handleStartAssetGroupMode}
                className={styles.toolbarButton}
                disabled={mode === 'paperclip'}
                aria-label="group assets together"
              >
                <FaPlusSquare fontSize="small" /> &nbsp; New Group
              </IconButton>
              <EditableSelect
                title="Select group"
                disabled={mode === 'paperclip'}
                data={project.assetGroups}
                selectedItem={currentAssetGroup}
                onSelectItem={handleSelectAssetGroup}
                onEditItem={handleEditAssetGroup}
                onDeleteItem={handleDeleteAssetGroup}
              />
            </div>
            {subMenu}
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
            open={editingGroup}
            onClose={handleCloseAssetGroupDialog}
            onSave={handleSavedAssetGroup}
            assets={groupedAssets}
            id={currentAssetGroup ? currentAssetGroup.id : ''}
            name={currentAssetGroup ? currentAssetGroup.name : ''}
            details={currentAssetGroup ? currentAssetGroup.details : ''}
          />
        </>
      );
    }
  }

  return <div className={styles.container}>{assetDisplay}</div>;
};

export default assetsComponent;
