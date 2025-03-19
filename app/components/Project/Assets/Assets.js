import React, { useState, useEffect } from 'react';
import { IconButton } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlusSquare, faSave, faBan, faFolderOpen, faFolderMinus, faFileCirclePlus } from '@fortawesome/free-solid-svg-icons';
import { cloneDeep } from 'lodash';
import Constants from '../../../constants/constants';
import AssetGroupDialog from '../../../containers/AssetGroupDialog/AssetGroupDialog';
import ExternalAssetDialog from '../../../containers/ExternalAssetDialog/ExternalAssetDialog';
import Error from '../../Error/Error';
import AssetTree from '../../AssetTree/AssetTree';
import AssetDetails from '../../AssetDetails/AssetDetails';
import ProjectEntryPoint from '../../ProjectEntryPoint/ProjectEntryPoint';
import AssetFilter from '../../Filter/Filter';
import EditableSelect from '../../EditableSelect/EditableSelect';
import Loading from '../../Loading/Loading';
import AssetUtil from '../../../utils/asset';
import ProjectUtil from '../../../utils/project';
import ProjectService from '../../../services/project';
import styles from './Assets.css';
import constants from '../../../constants/constants';

/**
 * Utility function to safely reset available filters for a project's assets
 *
 * @param {object} project The project we are resetting filters for
 * @returns An array representing the available filter options, or an empty array if the project is empty,
 *  null, or has no assets.
 */
function resetFilter(project) {
  return project && project.assets ? ProjectUtil.getAssetFilters(project.assets) : [];
}

const assetsComponent = (props) => {
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
    onAddedExternalAsset,
    onUpdatedExternalAsset,
    onDeletedExternalAsset,
    assetAttributes,
    dynamicDetails,
    scanStatus
  } = props;
  const [selectedAsset, setSelectedAsset] = useState();
  const treeRef = React.useRef(null);
  const externalTreeRef = React.useRef(null);
  const [mode, setMode] = useState('default'); // 'default', 'paperclip'
  // This key is part of a trick to get React to throw out and recreate the Asset Group
  // dialog when we have disposed of it - either by creating a project or cancelling.  This
  // tracks a sequential number that, when changed, signals React that the dialog can be
  // recreated. We don't care what this key is, it just has to change.
  const [assetDialogKey, setAssetDialogKey] = useState(0);
  // Offset the key to avoid overlap.
  const [externalAssetDialogKey, setExternalAssetDialogKey] = useState(1000);
  // UI state flag to let us know when we're in the process of adding/editing a group
  const [editingGroup, setEditingGroup] = useState(false);
  // UI state flag to let us know when we're in the process of adding/editing a group
  const [editingExternalAsset, setEditingExternalAsset] = useState(false);
  // Array of currently selected assets that are either for an existing asset group, or
  // that could be added to a new asset group.
  const [groupedAssets, setGroupedAssets] = useState([]);
  // Object that represents the currently selected asset group - either to be displayed, or
  // the one currently being edited.
  const [currentAssetGroup, setCurrentAssetGroup] = useState(null);
  // Object that represents the currently selected external asset.
  const [currentExternalAsset, setCurrentExternalAsset] = useState(null);
  // Object that represents the external asset that should be used for editing.  This is
  // separate from the currentExternalAsset because that tracks the current selection.
  const [editableExternalAsset, setEditableExternalAsset] = useState(null);
  // If the asset list filter is enabled or disabled
  const [filterEnabled, setFilterEnabled] = useState(true);
  // The actual contents of the filter (no filter by default)
  const [filter, setFilter] = useState([]);
  const filteredProjectAssets = ProjectUtil.filterProjectAssets(project, null);
  const [assets, setAssets] = useState(filteredProjectAssets);
  const [externalAssets, setExternalAssets] = useState(project && project.externalAssets ?
    project.externalAssets : AssetUtil.createEmptyExternalAssets());

  const projectService = new ProjectService();

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
    // When the project changes, reset our interface, filters, etc.
    setMode('default');
    setFilter(resetFilter(project));
    setAssets(ProjectUtil.filterProjectAssets(project, null));
    setCurrentAssetGroup(null);
    setGroupedAssets(null);
    setFilterEnabled(true);
    setExternalAssets(project.externalAssets ? project.externalAssets : AssetUtil.createEmptyExternalAssets());
  }, [project]);

  // Whenever the filter changes, update the list of assets to include only
  // those that should be displayed.
  const handleFilterChanged = (updatedFilter) => {
    setFilter(updatedFilter);
    setAssets(ProjectUtil.filterProjectAssets(project, updatedFilter));
  };

  const handleFilterReset = () => {
    setFilter(resetFilter(project));
    setAssets(ProjectUtil.filterProjectAssets(project, null));
  };

  // When the user triggers saving an Asset Group, update the UI so the dialog
  // appears to enter the asset group details.
  const handleStartSaveAssetGroup = () => {
    setAssetDialogKey(assetDialogKey + 1);
    setEditingGroup(true);
  };

  const handleCloseAssetGroupDialog = () => {
    setEditingGroup(false);
  };

  const handleCloseExternalAssetDialog = () => {
    setEditingExternalAsset(false);
  };

  const handleSavedAssetGroup = (group) => {
    if (group.id === null || group.id === undefined) {
      if (onAddedAssetGroup) {
        onAddedAssetGroup(group);
      }
    } else if (onUpdatedAssetGroup) {
      onUpdatedAssetGroup(group);
    }
    setEditingGroup(false);
  };

  const handleSavedExternalAsset = (asset, isNew) => {
    if (isNew) {
      if (onAddedExternalAsset) {
        onAddedExternalAsset(asset);
      }
    } else if (onUpdatedExternalAsset) {
      onUpdatedExternalAsset(asset);
    }
    setEditingExternalAsset(false);
  };

  // When the user selects a checkbox next to an asset - initially used just for building
  // asset groups, but consider if it could be more broadly repurposed.
  const handleCheckAsset = (asset, value) => {
    setGroupedAssets((prevState) => {
      const newAssetGroup = prevState ? [...prevState] : [];
      const index = newAssetGroup.findIndex((x) => x.uri === asset.uri);
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

  const handleEntryPointSelect = (asset, expandedNodes) => {
    let selAsset = asset;
    if (selAsset && (selAsset.contentTypes === null || selAsset.contentTypes === undefined)) {
      if (project && project.assets) {
        selAsset = AssetUtil.findDescendantAssetByUri(project.assets, selAsset.uri);
      }
    }

    setSelectedAsset(selAsset);
    if (onSelectedAsset) {
      onSelectedAsset(selAsset);
    }

    const expanded = treeRef.current.state.expandedNodes;
    expandedNodes.map((a) => {
      if (!expanded.includes(a)) {
        expanded.push(a);
      }
      return null;
    });
    treeRef.current.setState({ expandedNodes: expanded });
  };

  /**
   * Update the UI/state to reflect the currently selected asset group.  If we are displaying
   * an asset group, we also want to disable the filters.  In the future we likely want to make
   * filtering available, but are keeping it simple for now.
   * @param {object} group The selected asset group (null if nothing is selected)
   */
  const handleSelectAssetGroup = (group) => {
    if (group === null) {
      setCurrentAssetGroup(null);
      setGroupedAssets(null);
      setAssets(ProjectUtil.filterProjectAssets(project, filter));
      setFilterEnabled(true);
    } else {
      const clonedGroup = cloneDeep(group);

      // Define a new assets object.  This is because our asset structure requires a
      // top-level asset object, under which all of our grouped assets can go as its
      // children.
      const groupAssets = {
        uri: clonedGroup.name,
        type: Constants.AssetType.ASSET_GROUP,
        children: clonedGroup.assets,
      };

      // Make sure we merge in the notes and attributes.  We don't store those for the
      // group asset definition, so it needs to be added in here.
      projectService.addNotesAndAttributesToAssets(groupAssets, project.assets);

      // Update the UI to reflect the asset group.
      setCurrentAssetGroup(clonedGroup);
      setGroupedAssets(clonedGroup.assets);
      setAssets(groupAssets);
      setFilterEnabled(false);
    }
  };

  /**
   * When we begin editing the group, we need to consider a few parts of the state and UI that need updates:
   *  1. We need to establish the currently selected group to the one being edited
   *  2. The list of "selected" assets needs to be the assets specified in the asset group we're editing
   *  3. The currently displayed asset tree needs to include all assets
   *  4. The mode needs to be set to 'paperclip'
   * @param {object} group The group that is being edited
   */
  const handleEditAssetGroup = (group) => {
    const clonedGroup = cloneDeep(group);
    setAssets(ProjectUtil.filterProjectAssets(project, filter));
    setCurrentAssetGroup(clonedGroup);
    setGroupedAssets(clonedGroup.assets);
    treeRef.current.setPreCheckedNodes(clonedGroup.assets.map((x) => x.uri));
    setMode('paperclip');
  };

  const handleCancelEditAssetGroup = () => {
    // The important thing is resetting the mode to 'default' to get us out of being in
    // 'edit group' mode
    setMode('default');
    // The handleSelectAssetGroup will manage the rest of the UI updates for us, depending
    // on if we had an asset group selected or not (set in currentAssetGroup).
    handleSelectAssetGroup(currentAssetGroup);
  };

  const handleDeleteAssetGroup = (group) => {
    // If we just deleted the selected asset group, clear the selection
    if (currentAssetGroup && currentAssetGroup.id === group.id) {
      setCurrentAssetGroup(null);
    }

    if (onDeletedAssetGroup) {
      onDeletedAssetGroup(group);
    }
  };

  const handleEditExternalAsset = (asset) => {
    setEditableExternalAsset(cloneDeep(asset));
    setExternalAssetDialogKey(externalAssetDialogKey + 1);
    setEditingExternalAsset(true);
  };

  const handlSelectAsset = (selAsset) => {
    let asset = selAsset;
    // When we are showing an asset group, the actual asset objects aren't the complete picture.
    // The extra logic we use here is to enrich the selected asset, if it's missing some key
    // information.  The key thing we have right now is if it's missing the 'contentTypes' attribute.
    if (asset && (asset.contentTypes === null || asset.contentTypes === undefined)) {
      if (project && project.assets) {
        const foundAsset = AssetUtil.findDescendantAssetByUri(project.assets, asset.uri);
        if (foundAsset !== null) {
          asset = foundAsset;
        }
      }
    }

    setSelectedAsset(asset);
    if (onSelectedAsset) {
      onSelectedAsset(asset);
    }
  };

  /**
   * Prepare the state/UI for creating a new asset group
   */
  const handleNewAssetGroup = () => {
    setAssets(ProjectUtil.filterProjectAssets(project, filter));
    setCurrentAssetGroup(null);
    setGroupedAssets(null);
    treeRef.current.setPreCheckedNodes([]);
    setMode('paperclip');
  };

  /**
 * Prepare the state/UI for creating a new external asset
 */
  const handleNewExternalAsset = () => {
    setEditableExternalAsset(null);
    setExternalAssetDialogKey(externalAssetDialogKey + 1);
    setEditingExternalAsset(true);
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
        onEdit={handleEditExternalAsset}
        onRemove={onDeletedExternalAsset}
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
              <FontAwesomeIcon icon={faSave} /> &nbsp;Save Asset Group
            </IconButton>
            <IconButton
              className={styles.toolbarButton}
              aria-label="cancel creating asset group"
              onClick={handleCancelEditAssetGroup}
            >
              <FontAwesomeIcon icon={faBan} /> &nbsp;Cancel
            </IconButton>
          </div>
        );
      }

      let assetScanStatus = null;
      if (scanStatus === 'started') {
        assetScanStatus = <div className={styles.bottom}><Loading size="sm">Additional details about the assets are still loading...</Loading></div>;
      } else if (scanStatus === 'error') {
        assetScanStatus = <div className={styles.bottom}><Error size="sm">There was an error loading additional details about the assets</Error></div>;
      }

      // Note that for the AssetFilter component, we always want that to be the original
      // full list of assets.  That's why we use project.assets for that component's
      // propery, and the assets state variable for the AssetTree.
      assetDisplay = project.assets?.error ? (
        <Error>{assets.errorMessage}</Error>
      ) : (
        <>
          <AssetFilter
            filter={filter}
            mode="asset"
            disabled={!filterEnabled}
            onFilterChanged={handleFilterChanged}
            onFilterReset={handleFilterReset}
          />
          <div className={styles.tree}>
            <div className={styles.toolbar}>
              <IconButton
                onClick={() => treeRef.current.setExpandAll(true)}
                className={styles.toolbarButton}
                aria-label="expand all tree items"
                fontSize="small"
              >
                <FontAwesomeIcon icon={faFolderOpen} /> &nbsp;Expand
              </IconButton>
              <IconButton
                onClick={() => treeRef.current.setExpandAll(false)}
                className={styles.toolbarButton}
                aria-label="collapse all tree items"
                fontSize="small"
              >
                <FontAwesomeIcon icon={faFolderMinus} /> &nbsp;Collapse
              </IconButton>
              <IconButton
                onClick={handleNewExternalAsset}
                className={styles.toolbarButton}
                aria-label="add an external asset as a project resource"
                fontSize="small"
              >
                <FontAwesomeIcon icon={faFileCirclePlus} /> &nbsp;Add Resource
              </IconButton>
              <IconButton
                onClick={handleNewAssetGroup}
                className={styles.toolbarButton}
                disabled={mode === 'paperclip'}
                aria-label="group assets together"
              >
                <FontAwesomeIcon icon={faPlusSquare} /> &nbsp;New Group
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
              onSelectAsset={handlSelectAsset}
              selectedAsset={selectedAsset}
            />
            <AssetTree
              assets={externalAssets}
              ref={externalTreeRef}
              onSelectAsset={handlSelectAsset}
              selectedAsset={selectedAsset}
              rootSelectable={false}
            />
          </div>
          <div className={styles.details}>
            <ProjectEntryPoint
              assets={assets}
              rootUri={project.path}
              onSelect={handleEntryPointSelect}
            />
            {assetDetails}
          </div>
          {assetScanStatus}
          <AssetGroupDialog
            key={assetDialogKey}
            open={editingGroup}
            onClose={handleCloseAssetGroupDialog}
            onSave={handleSavedAssetGroup}
            assets={groupedAssets}
            id={currentAssetGroup ? currentAssetGroup.id : ''}
            name={currentAssetGroup ? currentAssetGroup.name : ''}
            details={currentAssetGroup ? currentAssetGroup.details : ''}
          />
          <ExternalAssetDialog
            key={externalAssetDialogKey}
            open={editingExternalAsset}
            onClose={handleCloseExternalAssetDialog}
            onSave={handleSavedExternalAsset}
            uri={editableExternalAsset ? editableExternalAsset.uri : ''}
            name={editableExternalAsset ? editableExternalAsset.name : ''}
          />
        </>
      );
    }
  }

  return <div className={styles.container}>{assetDisplay}</div>;
};

export default assetsComponent;
