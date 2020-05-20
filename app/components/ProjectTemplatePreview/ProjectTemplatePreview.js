/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CheckboxTree from 'react-checkbox-tree';

class ProjectTemplatePreview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: [],
      expanded: ['Project Root']
    };
  }

  render() {
    console.log(this.props.template);
    let templateAssets = [];
    if (this.props.template && this.props.template.assets) {
      templateAssets = this.props.template.assets.map(x => ({
        value: x.name,
        label: x.name,
        icon: (x.type === "folder" ? <i className="fa fa-folder" /> : <i className="fa fa-file" />)
      }));
    }

    const templateNodes = [
      {
        value: 'Project Root',
        label: 'Project Root',
        showCheckbox: false,
        children: templateAssets
      }
    ];

    return (
      <CheckboxTree
        iconsClass="fa5"
        nodes={templateNodes}
        checked={this.state.checked}
        expanded={this.state.expanded}
        onCheck={checked => this.setState({ checked })}
        onExpand={expanded => this.setState({ expanded })}
      />
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
