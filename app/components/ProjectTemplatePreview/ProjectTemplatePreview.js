import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CheckboxTree from 'react-checkbox-tree';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faFolder,
  faFile,
  faChevronRight,
  faChevronDown,
  faFolderOpen,
} from '@fortawesome/free-solid-svg-icons';
import styles from './ProjectTemplatePreview.css';

function contentsToNodes(assets) {
  if (assets) {
    return assets.map((x) => ({
      value: x.path,
      label: x.name,
      showCheckbox: false,
      icon:
        x.type === 'folder' ? (
          <FontAwesomeIcon icon={faFolder} />
        ) : (
          <FontAwesomeIcon icon={faFile} />
        ),
      children: x.contents ? contentsToNodes(x.contents) : null,
    }));
  }

  return [];
}

class ProjectTemplatePreview extends Component {
  constructor(props) {
    super(props);
    this.state = {
      checked: [],
      expanded: ['Project Root'],
    };
  }

  render() {
    let preview = (
      <div className={styles.placeholder}>Please select a template from a list on the left</div>
    );
    if (this.props.template) {
      let templateContents = [];
      if (this.props.template.contents) {
        templateContents = contentsToNodes(this.props.template.contents);
      }
      const templateNodes = [
        {
          value: 'Project Root',
          label: 'Project Root',
          showCheckbox: false,
          children: templateContents,
        },
      ];
      preview = (
        <>
          <strong>Preview:</strong>
          <CheckboxTree
            icons={{
              expandClose: (
                <FontAwesomeIcon className="rct-icon rct-icon-expand-close" icon={faChevronRight} />
              ),
              expandOpen: (
                <FontAwesomeIcon className="rct-icon rct-icon-expand-open" icon={faChevronDown} />
              ),
              parentClose: (
                <FontAwesomeIcon className="rct-icon rct-icon-collapse-all" icon={faFolder} />
              ),
              parentOpen: (
                <FontAwesomeIcon className="rct-icon rct-icon-parent-open" icon={faFolderOpen} />
              ),
              leaf: <FontAwesomeIcon className="rct-icon rct-icon-leaf-close" icon={faFile} />,
            }}
            nodes={templateNodes}
            checked={this.state.checked}
            expanded={this.state.expanded}
            onCheck={(checked) => this.setState({ checked })}
            onExpand={(expanded) => this.setState({ expanded })}
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
  template: PropTypes.object,
};

ProjectTemplatePreview.defaultProps = {
  template: null,
};

export default ProjectTemplatePreview;
