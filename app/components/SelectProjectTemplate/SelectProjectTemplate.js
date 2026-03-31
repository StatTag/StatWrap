import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import ProjectTemplateList from '../ProjectTemplateList/ProjectTemplateList';
import ProjectTemplatePreview from '../ProjectTemplatePreview/ProjectTemplatePreview';
import styles from './SelectProjectTemplate.css';

class SelectProjectTemplate extends Component {
  render() {
    let template = null;
    if (this.props.projectTemplates && this.props.selectedTemplate) {
      template = this.props.projectTemplates.find(
        (x) =>
          x.id === this.props.selectedTemplate.id &&
          x.version === this.props.selectedTemplate.version,
      );
    }
    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.templateList}>
          <strong>Available templates:</strong>
          <ProjectTemplateList
            templates={this.props.projectTemplates}
            selectedTemplate={this.props.selectedTemplate}
            onSelect={this.props.onSelectProjectTemplate}
          />
        </div>
        <div className={styles.templatePreview}>
          <ProjectTemplatePreview template={template} />
        </div>
      </div>
    );
  }
}

SelectProjectTemplate.propTypes = {
  projectTemplates: PropTypes.array.isRequired,
  selectedTemplate: PropTypes.object,
  onSelectProjectTemplate: PropTypes.func.isRequired,
};

SelectProjectTemplate.defaultProps = {
  selectedTemplate: null,
};

export default SelectProjectTemplate;
