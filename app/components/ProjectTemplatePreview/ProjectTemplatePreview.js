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
  faSquareCheck,
  faSquare,
} from '@fortawesome/free-solid-svg-icons';
import styles from './ProjectTemplatePreview.css';
import Constants from '../../constants/constants';
import { collectAllPaths } from '../../utils/templateContent';

function contentsToNodes(assets, selectable) {
  if (assets) {
    return assets.map((x) => ({
      value: x.path,
      label: x.name,
      showCheckbox: selectable,
      icon:
        x.type === Constants.AssetType.DIRECTORY ? (
          <FontAwesomeIcon icon={faFolder} />
        ) : (
          <FontAwesomeIcon icon={faFile} />
        ),
      children: x.contents ? contentsToNodes(x.contents, selectable) : null,
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

  /**
   * When a new template arrives, auto-check all items.
   */
  componentDidUpdate(prevProps) {
    if (
      this.props.template &&
      this.props.template !== prevProps.template &&
      this.props.selectable
    ) {
      const allPaths = collectAllPaths(this.props.template.contents);
      this.setState({ checked: allPaths }, () => {
        if (this.props.onCheckedChange) {
          this.props.onCheckedChange(allPaths);
        }
      });
    }
  }
  handleCheck = (checked) => {
    this.setState({ checked });
    if (this.props.onCheckedChange) {
      this.props.onCheckedChange(checked);
    }
  };


  render() {
    const { selectable, template } = this.props; 

    let preview = (
      <div className={styles.placeholder}>Please select a template from a list on the left</div>
    );
    if (template) {
      let templateContents = [];
      if (template.contents) {
        templateContents = contentsToNodes(template.contents, selectable);
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
          noCascade
            icons={{
              check: (
                <FontAwesomeIcon className="rct-icon rct-icon-check" icon={faSquareCheck} />
              ),
              uncheck: (
                <FontAwesomeIcon className="rct-icon rct-icon-uncheck" icon={faSquare} />
              ),
              halfCheck: (
                <FontAwesomeIcon className="rct-icon rct-icon-half-check" icon={faSquareCheck} style={{ opacity: 0.5 }} />
              ),
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
            onCheck={this.handleCheck}
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
  selectable: PropTypes.bool,
  onCheckedChange: PropTypes.func,
};

ProjectTemplatePreview.defaultProps = {
  template: null,
  selectable: false,
  onCheckedChange: null,
};

export default ProjectTemplatePreview;
