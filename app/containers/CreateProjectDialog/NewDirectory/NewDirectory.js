/* eslint-disable react/forbid-prop-types */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Grid } from '@material-ui/core';
import SelectProjectTemplate from '../../../components/SelectProjectTemplate/SelectProjectTemplate';
import ProjectTemplatePreview from '../../../components/ProjectTemplatePreview/ProjectTemplatePreview';
import styles from './NewDirectory.css';

class NewDirectory extends Component {
  render() {
    let template = null;
    if (this.props.projectTemplates) {
      template = this.props.projectTemplates.find(
        x => x.id === this.props.selectedTemplate
      );
    }
    return (
      <div className={styles.container} data-tid="container">
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <strong>Select the project template:</strong>
            <SelectProjectTemplate
              templates={this.props.projectTemplates}
              selectedTemplate={this.props.selectedTemplate}
              onSelect={this.props.onSelectProjectTemplate}
            />
          </Grid>
          <Grid item xs={6}>
            <strong>Preview:</strong>
            <ProjectTemplatePreview template={template} />
          </Grid>
        </Grid>
      </div>
    );
  }
}

NewDirectory.propTypes = {
  projectTemplates: PropTypes.array.isRequired,
  selectedTemplate: PropTypes.string,
  onSelectProjectTemplate: PropTypes.func.isRequired
};

NewDirectory.defaultProps = {
  selectedTemplate: null
};

export default NewDirectory;

/*
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Select from 'react-select';
import styles from './NewDirectory.css';

class NewDirectory extends Component {
  render() {
    let projectTypeList = [];
    if (this.props.projectTypes !== null) {
      projectTypeList = this.props.projectTypes.map(type => ({
        value: type.id,
        label: type.name
      }));
    }
    return (
      <div className={styles.container} data-tid="container">
        <Select options={projectTypeList} />
      </div>
    );
  }
}

NewDirectory.propTypes = {
  projectTypes: PropTypes.array.isRequired
};

export default NewDirectory;

*/
