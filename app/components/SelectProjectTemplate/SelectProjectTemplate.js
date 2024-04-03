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
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <strong>Available templates:</strong>
            <ProjectTemplateList
              templates={this.props.projectTemplates}
              selectedTemplate={this.props.selectedTemplate}
              onSelect={this.props.onSelectProjectTemplate}
            />
          </Grid>
          <Grid item xs={6}>
            <ProjectTemplatePreview template={template} />
          </Grid>
        </Grid>
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
