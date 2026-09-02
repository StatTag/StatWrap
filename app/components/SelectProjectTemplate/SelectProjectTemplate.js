import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@mui/material';
import ProjectTemplateList from '../ProjectTemplateList/ProjectTemplateList';
import ProjectTemplatePreview from '../ProjectTemplatePreview/ProjectTemplatePreview';
import styles from './SelectProjectTemplate.css';

class SelectProjectTemplate extends Component {
  render() {
    const { projectTemplates, selectedTemplate = null, onSelectProjectTemplate, onEditTemplate, onExportTemplate, onDeleteTemplate } = this.props;
    let template = null;
    if (projectTemplates && selectedTemplate) {
      template = projectTemplates.find(
        (x) =>
          x.id === selectedTemplate.id &&
          x.version === selectedTemplate.version,
      );
    }
    return (
      <div className={styles.container} data-tid="container">
        <div className={styles.templateList}>
          <strong>Available templates:</strong>
          <ProjectTemplateList
            templates={projectTemplates}
            selectedTemplate={selectedTemplate}
            onSelect={onSelectProjectTemplate}
            onEdit={onEditTemplate}
            onExport={onExportTemplate}
            onDelete={onDeleteTemplate}
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
  onEditTemplate: PropTypes.func,
  onExportTemplate: PropTypes.func,
  onDeleteTemplate: PropTypes.func,
};

export default SelectProjectTemplate;
