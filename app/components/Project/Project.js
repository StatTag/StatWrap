/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import { ipcRenderer } from 'electron';
import { Tab } from '@material-ui/core';
import { TabPanel, TabContext, TabList } from '@material-ui/lab';
import { withStyles } from '@material-ui/core/styles/';
import IconButton from '@material-ui/core/IconButton';
import { Star, StarBorder } from '@material-ui/icons';
import PropTypes from 'prop-types';
import EditableLabel from '../EditableLabel/EditableLabel';
import Welcome from '../Welcome/Welcome';
import About from './About/About';
import Assets from './Assets/Assets';
import styles from './Project.css';

import Messages from '../../constants/messages';

type Props = {};

// We typically do our styles in a separate CSS, but this has been the best way to
// override Material-UI specific styles, so we will do it in code.
const muiStyles = () => ({
  tabIndicator: {
    backgroundColor: 'white'
  },
  scrollButtons: {
    color: 'white'
  },
  tabRoot: {
    backgroundColor: '#3c629e',
    border: 'solid 1px #000',
    fontSize: '0.8rem'
  },
  tabSelected: {
    backgroundColor: '#6c92de',
    color: '#fff',
    fontSize: '0.9rem'
  },
  tabPanel: {
    padding: '10px'
  }
});

class Project extends Component<Props> {
  props: Props;

  constructor(props) {
    super(props);
    this.state = { selectedTab: 'about' };

    //this.handleUpdateAssetMetadata = this.handleUpdateAssetMetadata.bind(this);
  }

  componentDidMount() {
    //ipcRenderer.on(Messages.UPDATE_ASSET_METADATA_RESPONSE, this.handleUpdateAssetMetadataResponse);
  }

  componentWillUnmount() {
    ipcRenderer.removeListener(
      Messages.UPDATE_ASSET_METADATA_RESPONSE,
      this.handleUpdateAssetMetadataResponse
    );
  }

  handleUpdateAssetMetadataResponse = (asset) => {
    console.log('handleUpdateAssetMetadataResponse');
    console.log(asset);
  };

  changeHandler = (event, id) => {
    this.setState({ selectedTab: id });
  };

  assetUpdateNoteHandler = (asset, note) => {
    // const assetsCopy = [...this.props.project.assets];
    // ipcRenderer.send(Messages.UPDATE_PROJECT_ASSETS_NOTES);
  };

  assetAddNoteHandler = (asset, note) => {
    // const assetsCopy = [...this.props.project.assets];
    // const existingAsset = assetsCopy.find(x => x.uri === asset.uri);
    // if (existingAsset) {
    //   existingAsset.notes.push(note);
    //   ipcRenderer.send(Messages.UPDATE_PROJECT_ASSETS_NOTES);
    // }
    // else {
    //   // TODO: Error handler
    // }
  };

  render() {
    const tabStyle = { root: this.props.classes.tabRoot, selected: this.props.classes.tabSelected };
    const tabPanelStyle = { root: this.props.classes.tabPanel };

    let content = <Welcome />;
    if (this.props.project) {
      const about = this.props.project ? <About project={this.props.project} /> : null;
      const assets = this.props.project ? (
        <Assets
          project={this.props.project}
          onAddedAssetNote={this.assetUpdateHandler}
          onUpdatedAssetNote={this.assetUpdateHandler}
        />
      ) : null;
      const name = this.props.project ? (
        <EditableLabel
          text={this.props.project.name}
          labelFontWeight="bold"
          inputFontWeight="bold"
          inputClassName={styles.editableLabel}
          inputWidth="100%"
        />
      ) : null;

      content = (
        <TabContext value={this.state.selectedTab}>
          <div className={styles.header}>
            <div className={styles.titleContainer}>
              <IconButton color="inherit">
                {this.props.project && this.props.project.favorite ? <Star /> : <StarBorder />}
              </IconButton>
              <div className={styles.title}>{name}</div>
            </div>
            <TabList
              aria-label="Project details"
              variant="scrollable"
              onChange={this.changeHandler}
              classes={{
                indicator: this.props.classes.tabIndicator,
                scrollButtons: this.props.classes.scrollButtons
              }}
            >
              <Tab label="About" value="about" classes={tabStyle} />
              <Tab label="Assets" value="assets" classes={tabStyle} />
              <Tab label="Workflows" value="workflows" classes={tabStyle} />
              <Tab label="People" value="people" classes={tabStyle} />
              <Tab label="References" value="references" classes={tabStyle} />
              <Tab label="Notifications" value="notifications" classes={tabStyle} />
            </TabList>
          </div>
          <TabPanel value="about" classes={tabPanelStyle}>
            {about}
          </TabPanel>
          <TabPanel value="assets" classes={tabPanelStyle}>
            {assets}
          </TabPanel>
          <TabPanel value="workflows" classes={tabPanelStyle}>
            TBD
          </TabPanel>
          <TabPanel value="people" classes={tabPanelStyle}>
            TBD
          </TabPanel>
          <TabPanel value="references" classes={tabPanelStyle}>
            TBD
          </TabPanel>
          <TabPanel value="notiifications" classes={tabPanelStyle}>
            TBD
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
  classes: PropTypes.object
};

Project.defaultProps = {
  project: null,
  classes: null
};

export default withStyles(muiStyles)(Project);
