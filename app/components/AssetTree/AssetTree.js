/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
// import Menu from '@material-ui/core/Menu';
// import MenuItem from '@material-ui/core/MenuItem';
import PropTypes from 'prop-types';
import AssetNode from './AssetNode/AssetNode';
import MetadataUtil from '../../utils/metadata';
import styles from './AssetTree.css';

// This implementation borrows heavily from: https://github.com/davidtran/simple-treeview
// Many thanks to davidtran for the implementation to get us started!

const mapNode = node => {
  return [{ uri: node.uri, node }, ...mapNodeChildren(node.children)];
};

const mapNodeChildren = (children = []) => {
  return children.flatMap(c => mapNode(c));
};

class AssetTree extends Component {
  constructor(props) {
    super(props);
    this.uriNodeMap = mapNode(props.project.assets);
    this.state = {
      nodes: props.project.assets //,
      // mouseX: null,
      // mouseY: null,
      // selectedNode: null
    };
  }

  // handleContextClick = event => {
  //   event.preventDefault();
  //   this.setState({
  //     mouseX: event.clientX - 2,
  //     mouseY: event.clientY - 4
  //   });
  // };

  // handleContextClose = () => {
  //   this.setState({ mouseX: null, mouseY: null });
  // };

  handleClick = node => {
    //this.setState({ selectedNode: node.uri });
    this.props.onSelectAsset(node);
  };

  onToggle = node => {
    const { nodes } = this.state;
    const foundNode = this.uriNodeMap.find(x => x.uri === node.uri);
    if (foundNode) {
      foundNode.isOpen = !node.isOpen;
      foundNode.node.isOpen = foundNode.isOpen;
      this.setState({ nodes });
    }
  };

  render() {
    const filteredAssets = !this.props.project.assets
      ? null
      : MetadataUtil.filterIncludedFileAssets(this.props.project.assets);
    const assetTree =
      !filteredAssets || !filteredAssets.children
        ? null
        : filteredAssets.children.map(child => (
            <AssetNode
              // onRightClick={this.handleContextClick}
              onClick={this.handleClick}
              key={child.uri}
              node={child}
              selectedAsset={this.props.selectedAsset}
              onToggle={this.onToggle}
            />
          ));

    // <Menu
    //     keepMounted
    //     open={this.state.mouseY !== null}
    //     onClose={this.handleContextClose}
    //     anchorReference="anchorPosition"
    //     anchorPosition={
    //       this.state.mouseY !== null && this.state.mouseX !== null
    //         ? { top: this.state.mouseY, left: this.state.mouseX }
    //         : undefined
    //     }
    //   >
    //     <MenuItem onClick={this.handleContextClose}>Notes</MenuItem>
    //   </Menu>

    return <div className={styles.container}>{assetTree}</div>;
  }
}

AssetTree.propTypes = {
  project: PropTypes.object.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAsset: PropTypes.object
};

export default AssetTree;
