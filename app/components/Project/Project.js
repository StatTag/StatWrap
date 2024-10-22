import React, { Component } from 'react';
import { Tab, Tabs } from '@mui/material';
import { TabPanel, TabContext } from '@mui/lab';
import { withStyles } from '@mui/styles/';
import { cloneDeep } from 'lodash';
import IconButton from '@mui/material/IconButton';
import { Star, StarBorder } from '@mui/icons-material';
import PropTypes from 'prop-types';
import EditableLabel from '../EditableLabel/EditableLabel';
import Welcome from '../Welcome/Welcome';
import About from './About/About';
import Assets from './Assets/Assets';
import Workflow from '../Workflow/Workflow';
import People from '../People/People';
import ProjectLog from '../ProjectLog/ProjectLog';
import ProjectNotes from '../ProjectNotes/ProjectNotes';
import { ActionType, EntityType, DescriptionContentType, AssetType } from '../../constants/constants';
import AssetUtil from '../../utils/asset';
import NoteUtil from '../../utils/note';
import ProjectUtil from '../../utils/project';
import GeneralUtil from '../../utils/general';
import styles from './Project.css';
import UserContext from '../../contexts/User';

type Props = {};

// We typically do our styles in a separate CSS, but this has been the best way to
// override Material-UI specific styles, so we will do it in code.
/*
const muiStyles = () => ({
  tabIndicator: {
    backgroundColor: 'white'
  },
  scrollButtons: {
    color: 'white'
  },
  tabRoot: {
    backgroundColor: '#cccccc',
    border: 'solid 1px #000',
    fontSize: '0.8rem'
  },
  tabSelected: {
    backgroundColor: '#ffffff',
    border: 'solid 1px #836EAA',
    color: '#836EAA',
    fontSize: '0.9rem'
  },
  tabPanel: {
    padding: '10px'
  }
});
*/
const muiStyles = () => ({
  tabIndicator: {
    backgroundColor: 'white'
  },
  tabRoot: {
    backgroundColor: '#efefef',
    fontSize: '0.8rem'
  },
  tabSelected: {
    backgroundColor: '#ffffff',
    fontSize: '0.8rem'
  },
  tabPanel: {
    padding: '10px'
  }
});

class Project extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.state = { selectedTab: 'about', showLogUpdatesOnly: false };
  }

  changeHandler = (event, id) => {
    this.setState({ selectedTab: id });
  };

  aboutDetailsUpdateHandler = (descriptionText, descriptionUri, categories) => {
    const project = { ...this.props.project, categories };
    // If the description URI is set, we will use that for the description content.  Otherwise
    // we will fall back to use the provided description text.
    if (descriptionUri) {
      // If the user has provided custom text for the description before, we're going to preserve it.
      // This may be unnecessary, but the concern is the user accidentally switching over to a file
      // and then wanting to revert back to their content.
      project.description = {
        contentType: DescriptionContentType.URI,
        uri: descriptionUri,
        content: descriptionText
      };
    } else {
      // If the user is entering a custom description, we're going to clear out the URI if one was
      // selected before. If the user accidentally switched, it's less of a concern for them to have
      // to re-link a file because it's quick to do.
      project.description = {
        contentType: DescriptionContentType.MARKDOWN,
        content: descriptionText
      };
    }

    if (this.props.onUpdated) {
      const user = this.context;
      this.props.onUpdated(
        project,
        ActionType.ABOUT_DETAILS_UPDATED,
        EntityType.PROJECT,
        project.id,
        ActionType.ABOUT_DETAILS_UPDATED,
        `${user} updated the project details in the 'About' page`,
        { description: project.description, categories }
      );
    }
  };

  /**
   * More generic handler to implement the common upsert functions needed for asset and project notes
   * @param {object} entity The entity assumed to have a `notes` collection that the note should be upserted into
   * @param {String} entityName A string identifier for the type of entity, which is used for audit logging
   * @param {String} entityId An identifier for the entity, to be used for audit logging
   * @param {object} action An action descriptor, used for logging
   * @param {String} text The text of the note to add/update
   * @param {object} note Optional - an existing note (if being updated)
   */
  upsertNoteHandler = (entity, entityName, entityId, action, text, note) => {
    const user = this.context;
    const capitalizedEntityName = entityName.trim().replace(/^\w/, c => c.toUpperCase());
    // We already have the asset, so manage updating the note

    // Because we are updating a note, if there is no notes collection we obviously don't
    // have anything to update.  Instead we'll just treat it like adding a new note.
    if (!entity.notes) {
      console.warn(`Creating notes collection because no notes available for ${entityName}`);
      entity.notes = [];
      const newNote = note ? { ...note, text } : NoteUtil.createNote(user, text);
      entity.notes.push(newNote);
      action.type = ActionType.NOTE_ADDED;
      action.description = `${user} added note to ${entityName} ${entityId}`;
      action.details = newNote;
    } else {
      // Try to find the existing note, if an existing note was provided.
      const existingNote = note ? entity.notes.find(x => x.id === note.id) : null;

      if (!existingNote) {
        console.log('Adding a new note');
        const newNote = NoteUtil.createNote(user, text);
        entity.notes.push(newNote);
        action.type = ActionType.NOTE_ADDED;
        action.description = `${user} added note to ${entityName} ${entityId}`;
        action.details = newNote;
      } else if (existingNote.content === text) {
        console.log('Note is unchanged - no update');
      } else {
        console.log('Updating existing note');
        const originalNote = { ...existingNote };
        existingNote.content = text;
        existingNote.updated = NoteUtil.getNoteDate();

        action.type = ActionType.NOTE_UPDATED;
        action.description = `${user} updated note for ${entityName} ${entityId}`;
        action.details = { old: originalNote, new: note };
      }
    }

    // Before leaving, we'll format the action title.  We do this
    // at the end so the string formatting code lives in one spot
    action.title = `${capitalizedEntityName} ${action.type}`;
  };

  unchangedNote = (note, text) => {
    // If the user clicked into a new note and clicked out without adding anything we will skip
    // adding the new note.  We will allow if the user wants a blank note that they already created.
    if ((!note || note === undefined) && (!text || text === '')) {
      console.log('Detected an empty new note - this will not be created');
      return true;
    }
    return false;
  };

  /**
   * General handler to either insert a new note for an asset or update an existing note for
   * an asset.  It figures out the appropriate action to take depending on if the note parameter
   * is provided or not.
   * @param {object} project The project for which the note should be added/updated
   * @param {string} text The note text
   * @param {object} note Optional parameter if there is an existing note being updated.  If falsey, we assume this is a new note.
   */
  projectUpsertNoteHandler = (project, text, note) => {
    if (this.unchangedNote(note, text)) {
      return;
    }

    const currentProject = { ...this.props.project };
    if (currentProject.id !== project.id) {
      console.warn(
        `Project to update (${project.id}) does not match current project (${currentProject.id})`
      );
      return;
    }

    const action = { type: '', title: '', description: '', details: null };
    this.upsertNoteHandler(
      currentProject,
      EntityType.PROJECT,
      currentProject.name,
      action,
      text,
      note
    );

    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PROJECT,
        project.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  personUpsertNoteHandler = (person, text, note) => {
    if (this.unchangedNote(note, text)) {
      return;
    }

    const currentProject = { ...this.props.project };

    const action = { type: '', title: '', description: '', details: null };
    this.upsertNoteHandler(
      person,
      EntityType.PERSON,
      GeneralUtil.formatName(person.name),
      action,
      text,
      note
    );

    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PERSON,
        person.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  /**
   * General handler to either insert a new note for an asset or update an existing note for
   * an asset.  It figures out the appropriate action to take depending on if the note parameter
   * is provided or not.
   * @param {object} asset The asset for which the note should be added/updated
   * @param {string} text The note text
   * @param {object} note Optional parameter if there is an existing note being updated.  If falsey, we assume this is a new note.
   */
  assetUpsertNoteHandler = (asset, text, note) => {
    if (this.unchangedNote(note, text)) {
      return;
    }

    const project = { ...this.props.project };
    let assetsCopy = null;
    // Depending on if this is a core asset or an external asset, we need to select the correct container.  The rest of
    // the code will work the same.
    const isExternalAsset = (asset.type === AssetType.URL);
    if (isExternalAsset) {
      // externalAssets is an array, not an object, so we need to do a little structure change when
      // we copy it so the rest of the code will work without modification.
      assetsCopy = { children: cloneDeep(project.externalAssets) };
    } else {
      assetsCopy = { ...project.assets };
    }

    // When searching for the existing asset, remember that assets is an object and the top-level item is
    // in the root of the object.  Start there before looking at the children.
    const action = { type: '', title: '', description: '', details: null };
    const existingAsset = AssetUtil.findDescendantAssetByUri(assetsCopy, asset.uri);
    if (!existingAsset) {
      console.log('No existing asset found in project data');
      // No existing asset, so we are going to register a new entry
      const newAsset = { ...asset };
      if (!newAsset.notes) {
        newAsset.notes = [];
      }
      newAsset.notes.push(note);
      action.type = ActionType.NOTE_ADDED;
      action.description = `Added note to asset ${asset.uri}`;
      action.details = note;
      // TODO - fix bug here - should be failing
      assetsCopy.push(newAsset);
    } else {
      this.upsertNoteHandler(existingAsset, 'asset', asset.uri, action, text, note);
    }

    // Now at the end, make sure we're updating the correct container depending on the type
    // of asset we received
    if (isExternalAsset) {
      project.externalAssets = assetsCopy.children;
    } else {
      project.assets = assetsCopy;
    }

    if (this.props.onUpdated) {
      this.props.onUpdated(
        project,
        action.type,
        isExternalAsset ? EntityType.EXTERNAL_ASSET : EntityType.ASSET,
        asset.uri,
        action.title,
        action.description,
        action.details
      );
    }
  };

  /**
   * More generic handler to implement the common delete functions needed for asset and project notes
   * @param {object} entity The entity assumed to have a `notes` collection that the note should be upserted into
   * @param {String} entityName A string identifier for the type of entity, which is used for audit logging
   * @param {String} entityId An identifier for the entity, to be used for audit logging
   * @param {object} note Optional - an existing note (if being updated)
   * @returns {String} An action description that can be used for logging
   */
  deleteNoteHandler = (entity, entityName, entityId, note) => {
    // Try to find the existing note, if an existing note was provided.
    const index = entity.notes.findIndex(x => x.id === note.id);
    let actionDescription = '';
    if (index === -1) {
      console.warn(`Could not find the note with ID ${note.id} for this asset to delete it`);
    } else {
      const user = this.context;
      actionDescription = `${user} deleted note from ${entityName} ${entityId}`;
      entity.notes.splice(index, 1);
    }

    return actionDescription;
  };

  /**
   * Handler for when an asset's attribute (a flexible collection of items) is updated
   * @param {object} asset The asset that has had its attribute updated
   * @param {object} name The name of the attribute that is updated
   * @param {any} value The value of the updated attribute.  Its type depends on the configuration of the attribute.
   */
  assetUpdateAttributeHandler = (asset, name, value) => {
    const project = { ...this.props.project };
    const assetsCopy = { ...project.assets };

    const existingAsset = AssetUtil.findDescendantAssetByUri(assetsCopy, asset.uri);
    let actionDescription = '';
    if (!existingAsset) {
      console.warn('Could not find the asset to update its attribute');
    } else {
      actionDescription = `Updated ${asset.uri} attribute '${name}' to '${value}'`;
    }

    if (!existingAsset.attributes) {
      existingAsset.attributes = {};
    }

    existingAsset.attributes[name] = value;
    project.assets = assetsCopy;
    if (this.props.onUpdated) {
      this.props.onUpdated(
        project,
        ActionType.ATTRIBUTE_UPDATED,
        EntityType.ASSET,
        asset.uri,
        `Asset ${ActionType.ATTRIBUTE_UPDATED}`,
        actionDescription,
        { name, value }
      );
    }
  };

  assetDeleteNoteHandler = (asset, note) => {
    const project = { ...this.props.project };
    const assetsCopy = { ...project.assets };
    // When searching for the existing asset, remember that assets is an object and the top-level item is
    // in the root of the object.  Start there before looking at the children.
    const existingAsset = AssetUtil.findDescendantAssetByUri(assetsCopy, asset.uri);
    let actionDescription = '';
    if (!existingAsset) {
      console.warn('Could not find the asset to delete its note');
    } else {
      actionDescription = this.deleteNoteHandler(asset, 'asset', asset.uri, note);
    }

    project.assets = assetsCopy;
    if (this.props.onUpdated) {
      this.props.onUpdated(
        project,
        ActionType.NOTE_DELETED,
        EntityType.ASSET,
        asset.uri,
        `Asset ${ActionType.NOTE_DELETED}`,
        actionDescription,
        note
      );
    }
  };

  assetSelectedHandler = asset => {
    if (this.props.onAssetSelected) {
      this.props.onAssetSelected(asset);
    }
  };

  projectDeleteNoteHandler = (project, note) => {
    const currentProject = { ...this.props.project };
    if (currentProject.id !== project.id) {
      console.warn(
        `Project to update (${project.id}) does not match current project (${currentProject.id})`
      );
      return;
    }

    const actionDescription = this.deleteNoteHandler(
      project,
      EntityType.PROJECT,
      project.name,
      note
    );
    if (this.props.onUpdated) {
      this.props.onUpdated(
        project,
        ActionType.NOTE_DELETED,
        EntityType.PROJECT,
        project.id,
        `Project ${ActionType.NOTE_DELETED}`,
        actionDescription,
        note
      );
    }
  };

  personDeleteNoteHandler = (person, note) => {
    const currentProject = { ...this.props.project };
    const actionDescription = this.deleteNoteHandler(
      person,
      EntityType.PERSON,
      GeneralUtil.formatName(person.name),
      note
    );
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        ActionType.NOTE_DELETED,
        EntityType.PERSON,
        person.id,
        `Person ${ActionType.NOTE_DELETED}`,
        actionDescription,
        note
      );
    }
  };

  deletePersonHandler = person => {
    const currentProject = { ...this.props.project };

    if (!currentProject.people) {
      console.warn(`Tried to delete ${person.id} but no people exist in project`);
      return;
    }

    const foundIndex = currentProject.people.findIndex(p => p.id === person.id);
    if (foundIndex === -1) {
      console.warn(`Tried to delete ${person.id} but they are not listed in the project`);
      return;
    }

    currentProject.people.splice(foundIndex, 1);

    const user = this.context;
    const actionDescription = `${user} deleted person ${GeneralUtil.formatName(
      person.name
    )} from project`;
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        ActionType.PERSON_DELETED,
        EntityType.PROJECT,
        currentProject.id,
        `Project ${ActionType.PERSON_DELETED}`,
        actionDescription,
        person
      );
    }
  };

  createUpdatePersonHandler = person => {
    const currentProject = { ...this.props.project };

    if (!currentProject.people) {
      currentProject.people = [];
    }

    const user = this.context;
    const foundIndex = currentProject.people.findIndex(p => p.id === person.id);
    let action = null;
    let actionDescription = null;
    if (foundIndex === -1) {
      // Add a new person
      action = ActionType.PERSON_ADDED;
      actionDescription = `${user} added person to project`;
      currentProject.people.push(person);
    } else {
      action = ActionType.PERSON_UPDATED;
      actionDescription = `${user} updated person in project`;
      // Update the existing person, but just what would be changed within
      // the dialog (name, affiliation, roles)
      currentProject.people[foundIndex] = {
        ...currentProject.people[foundIndex],
        name: person.name,
        affiliation: person.affiliation,
        roles: person.roles
      };
    }

    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action,
        EntityType.PROJECT,
        currentProject.id,
        `Project ${action}`,
        actionDescription,
        person
      );
    }
  };

  assetGroupDeletedHandler = group => {
    const currentProject = { ...this.props.project };

    const action = {
      type: ActionType.ASSET_GROUP_DELETED,
      title: ActionType.ASSET_GROUP_DELETED,
      description: 'Deleted asset group',
      details: group
    };

    ProjectUtil.removeAssetGroup(currentProject, group);
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PROJECT,
        currentProject.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  assetGroupAddedHandler = group => {
    const user = this.context;
    const currentProject = { ...this.props.project };

    const action = {
      type: ActionType.ASSET_GROUP_ADDED,
      title: ActionType.ASSET_GROUP_ADDED,
      description: `${user} created asset group ${group.name}`,
      details: group
    };

    ProjectUtil.upsertAssetGroup(currentProject, group);
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PROJECT,
        currentProject.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  assetGroupUpdatedHandler = group => {
    const user = this.context;
    const currentProject = { ...this.props.project };

    const oldAssetGroup = cloneDeep(this.props.project.assetGroups.find(x => x.id === group.id));
    const action = {
      type: ActionType.ASSET_GROUP_UPDATED,
      title: ActionType.ASSET_GROUP_UPDATED,
      description: `${user} updated asset group ${group.name} ${group.id}`,
      details: { old: oldAssetGroup, new: group }
    };

    ProjectUtil.upsertAssetGroup(currentProject, group);
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PROJECT,
        currentProject.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  externalAssetDeletedHandler = asset => {
    const currentProject = { ...this.props.project };

    const action = {
      type: ActionType.EXTERNAL_ASSET_DELETED,
      title: ActionType.EXTERNAL_ASSET_DELETED,
      description: 'Deleted external asset',
      details: asset
    };

    ProjectUtil.removeExternalAsset(currentProject, asset);
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PROJECT,
        currentProject.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  externalAssetAddedHandler = asset => {
    const user = this.context;
    const currentProject = { ...this.props.project };

    const action = {
      type: ActionType.EXTERNAL_ASSET_ADDED,
      title: ActionType.EXTERNAL_ASSET_ADDED,
      description: `${user} created external asset ${asset.name} at ${asset.uri}`,
      details: asset
    };

    ProjectUtil.upsertExternalAsset(currentProject, asset);
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PROJECT,
        currentProject.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  externalAssetUpdatedHandler = asset => {
    const user = this.context;
    const currentProject = { ...this.props.project };

    const oldExternalAsset = cloneDeep(this.props.project.externalAssets.find(x => x.uri === asset.uri));
    const action = {
      type: ActionType.EXTERNAL_ASSET_UPDATED,
      title: ActionType.EXTERNAL_ASSET_UPDATED,
      description: `${user} updated external asset ${asset.name} ${asset.uri}`,
      details: { old: oldExternalAsset, new: asset }
    };

    ProjectUtil.upsertExternalAsset(currentProject, asset);
    if (this.props.onUpdated) {
      this.props.onUpdated(
        currentProject,
        action.type,
        EntityType.PROJECT,
        currentProject.id,
        action.title,
        action.description,
        action.details
      );
    }
  };

  clickUpdatesLinkHandler = () => {
    this.setState({ selectedTab: 'projectLog', showLogUpdatesOnly: true });
  };

  render() {
    const tabStyle = { root: this.props.classes.tabRoot, selected: this.props.classes.tabSelected };
    const tabPanelStyle = { root: this.props.classes.tabPanel };

    let content = <Welcome />;
    if (this.props.project) {
      const about = this.props.project ? (
        <About
          onUpdateDetails={this.aboutDetailsUpdateHandler}
          onAddedNote={this.projectUpsertNoteHandler}
          onUpdatedNote={this.projectUpsertNoteHandler}
          onDeletedNote={this.projectDeleteNoteHandler}
          project={this.props.project}
          updates={this.props.logs ? this.props.logs.updates : null}
          onClickUpdatesLink={this.clickUpdatesLinkHandler}
        />
      ) : null;
      const assets = this.props.project ? (
        <Assets
          project={this.props.project}
          onAddedAssetNote={this.assetUpsertNoteHandler}
          onUpdatedAssetNote={this.assetUpsertNoteHandler}
          onDeletedAssetNote={this.assetDeleteNoteHandler}
          onUpdatedAssetAttribute={this.assetUpdateAttributeHandler}
          onSelectedAsset={this.assetSelectedHandler}
          onAddedAssetGroup={this.assetGroupAddedHandler}
          onUpdatedAssetGroup={this.assetGroupUpdatedHandler}
          onDeletedAssetGroup={this.assetGroupDeletedHandler}
          onAddedExternalAsset={this.externalAssetAddedHandler}
          onUpdatedExternalAsset={this.externalAssetUpdatedHandler}
          onDeletedExternalAsset={this.externalAssetDeletedHandler}
          assetAttributes={this.props.configuration.assetAttributes}
          dynamicDetails={this.props.assetDynamicDetails}
        />
      ) : null;
      const workflow = this.props.project ? <Workflow project={this.props.project} /> : null;
      const name = this.props.project ? (
        <EditableLabel
          text={this.props.project.name}
          labelFontWeight="bold"
          containerClassName={styles.projectName}
          inputFontWeight="bold"
          inputClassName={styles.editableLabel}
          inputWidth="100%"
        />
      ) : null;

      const projectPath = this.props.project ? (
        <div className={styles.projectPath}>{this.props.project.path}</div>
      ) : null;

      const projectNotes = this.props.project ? (
        <ProjectNotes
          project={this.props.project}
          onAddedNote={this.projectUpsertNoteHandler}
          onUpdatedNote={this.projectUpsertNoteHandler}
          onDeletedNote={this.projectDeleteNoteHandler}
        />
      ) : null;

      const people = this.props.project ? (
        <People
          project={this.props.project}
          list={this.props.project.people}
          mode="project"
          onSave={this.createUpdatePersonHandler}
          onDelete={this.deletePersonHandler}
          onAddedPersonNote={this.personUpsertNoteHandler}
          onUpdatedPersonNote={this.personUpsertNoteHandler}
          onDeletedPersonNote={this.personDeleteNoteHandler}
        />
      ) : null;

      const projectLog =
        this.props.project && this.props.logs ? (
          <ProjectLog
            project={this.props.project}
            error={this.props.logs.errorMessage}
            feed={this.props.logs.logs}
            updates={this.props.logs.updates}
            showUpdates={this.state.showLogUpdatesOnly}
          />
        ) : null;

      content = (
        <TabContext value={this.state.selectedTab}>
          <div className={styles.header}>
            <div className={styles.titleContainer}>
              <IconButton color="inherit">
                {this.props.project && this.props.project.favorite ? <Star /> : <StarBorder />}
              </IconButton>
              <div className={styles.title}>
                {name}
                {projectPath}
              </div>
            </div>
            <Tabs
              aria-label="Project details"
              variant="scrollable"
              onChange={this.changeHandler}
              classes={{
                indicator: this.props.classes.tabIndicator,
                scrollButtons: this.props.classes.scrollButtons
              }}
              value={this.state.selectedTab}
            >
              <Tab label="Dashboard" value="about" classes={tabStyle} />
              <Tab label="Assets" value="assets" classes={tabStyle} />
              <Tab label="Workflows" value="workflows" classes={tabStyle} />
              <Tab label="People" value="people" classes={tabStyle} />
              <Tab label="Notes" value="projectNotes" classes={tabStyle} />
              <Tab label="Project Log" value="projectLog" classes={tabStyle} />
            </Tabs>
          </div>
          <TabPanel value="about" classes={tabPanelStyle}>
            {about}
          </TabPanel>
          <TabPanel value="assets" classes={tabPanelStyle}>
            {assets}
          </TabPanel>
          <TabPanel value="workflows" classes={tabPanelStyle}>
            {workflow}
          </TabPanel>
          <TabPanel value="people" classes={tabPanelStyle}>
            {people}
          </TabPanel>
          <TabPanel value="projectNotes" classes={tabPanelStyle}>
            {projectNotes}
          </TabPanel>
          <TabPanel value="projectLog" classes={tabPanelStyle}>
            {projectLog}
          </TabPanel>
        </TabContext>
      );
    }
    return (
      <div className={styles.container} data-tid="container">
        {content}
      </div>
    );
  }
}

Project.propTypes = {
  project: PropTypes.object,
  classes: PropTypes.object,
  onUpdated: PropTypes.func,
  onAssetSelected: PropTypes.func,
  // This object has the following structure:
  // {
  //   logs: array<string>   - the actual log data
  //   updates: object       - information about updates to the project since the
  //                           user last viewed it
  //   errorMessage: string? - if set, the logs collection should be assumed invalid
  //                           due to a load failure
  // }
  logs: PropTypes.object,
  // This object has the following structure:
  // {
  // }
  configuration: PropTypes.object,
  assetDynamicDetails: PropTypes.object
};

Project.defaultProps = {
  project: null,
  classes: null,
  onUpdated: null,
  onAssetSelected: null,
  logs: null,
  configuration: null,
  assetDynamicDetails: null
};

Project.contextType = UserContext;

export default withStyles(muiStyles)(Project);
