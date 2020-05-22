/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CheckboxTree from 'react-checkbox-tree';
import styles from './ProjectTemplatePreview.css';

function assetsToNodes(assets) {
  if (assets) {
    return assets.map(x => ({
      value: x.name,
      label: x.name,
      icon: (x.type === "folder" ? <i className="fa fa-folder" /> : <i className="fa fa-file" />),
      children: (x.children) ? assetsToNodes(x.children) : null
    }));
  }

  return [];
}

class ProjectTemplatePreview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: [],
      expanded: ['Project Root']
    };
  }

  render() {
    console.log(this.state);
    let preview = (
      <div className={styles.placeholder}>Please select a template from a list on the left</div>
    );
    if (this.props.template) {
      let templateAssets = [];
      if (this.props.template.assets) {
        templateAssets = assetsToNodes(this.props.template.assets);
      }
      const templateNodes = [
        {
          value: 'Project Root',
          label: 'Project Root',
          showCheckbox: false,
          children: templateAssets
        }
      ];
      preview = (
        <>
          <strong>Preview:</strong>
          <CheckboxTree
            iconsClass="fa5"
            nodes={templateNodes}
            checked={this.state.checked}
            expanded={this.state.expanded}
            onCheck={checked => this.setState({ checked })}
            onExpand={expanded => this.setState({ expanded })}
          />
        </>
      );
    }

    return (
      <div className={styles.container} data-tid="container">
        {preview}
      </div>
    );
  }
}

ProjectTemplatePreview.propTypes = {
  template: PropTypes.object
};

ProjectTemplatePreview.defaultProps = {
  template: null
};

export default ProjectTemplatePreview;
