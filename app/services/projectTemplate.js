/* eslint-disable func-names */
/* eslint-disable class-methods-use-this */
import templateList from '../constants/project-templates.json';

const fs = require('fs');
const path = require('path');

// Recursive function to get the hierarchy of files and folders in dirPath
// Derived from https://coderrocketfuel.com/article/recursively-list-all-the-files-in-a-directory-using-node-js
function getAllFiles(dirPath) {
  const files = fs.readdirSync(dirPath);
  const arrayOfFiles = [];
  files.forEach(function(file) {
    const filePath = `${dirPath}/${file}`;
    if (!templateList.ignore.includes(file)) {
      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles.push({
          name: file,
          type: 'folder',
          path: path.join(dirPath, '/', file),
          contents: getAllFiles(filePath)
        });
      } else {
        arrayOfFiles.push({
          name: file,
          type: 'file',
          path: path.join(dirPath, '/', file)
        });
      }
    }
  });

  return arrayOfFiles;
}

// For a given template, create all of the files and folders in dirPath
// This handles recursively defined template structures.
function createAllTemplateItems(dirPath, contents) {
  contents.forEach(function(item) {
    const newPath = path.join(dirPath, item.name);
    if (item.type === 'file') {
      fs.copyFileSync(item.path, newPath);
    } else {
      fs.mkdirSync(newPath);
      createAllTemplateItems(newPath, item.contents);
    }
  });
}

// For a given template, find the list of files and folders that have been defined
function getTemplateContents(template, templateRoot) {
  const templateDirs = fs.readdirSync(templateRoot);
  if (templateDirs.includes(template.id)) {
    const fullTemplate = { ...template };
    fullTemplate.contents = getAllFiles(path.join(templateRoot, '/', template.id));
    return fullTemplate;
  }

  return null;
}

export default class ProjectTemplateService {
  // The an array of project templates, including name, description, and
  // file contents.
  //  We will cache the project templates once we've loaded them.
  projectTemplates = null;

  constructor() {
    this.projectTemplates = null;
  }

  // Load the list of project templates, stored in templateRoot
  loadProjectTemplates = templateRoot => {
    if (this.projectTemplates) {
      return this.projectTemplates;
    }

    const templates = [];
    templateList.templates.forEach(function(template) {
      const contents = getTemplateContents(template, templateRoot);
      if (contents) {
        templates.push(contents);
      }
    });

    this.projectTemplates = [...templates];

    // TODO: Can merge in user-defined project templates later.  Right now just our pre-defined ones
    return this.projectTemplates;
  };

  // Instantiate baseDirectory (assumed to be the root of the project we want the
  // template created in) with all files and folders stored in the template identified
  // by templateId
  createTemplateContents = (baseDirectory, templateId) => {
    if (!baseDirectory) {
      throw new Error(`You must specify a base directory to create the template in`);
    } else if (!fs.existsSync(baseDirectory)) {
      throw new Error(`The base directory ${baseDirectory} does not exist`);
    }

    if (!templateId) {
      throw new Error(`You must specify the template ID to create`);
    }
    const template = this.projectTemplates.find(t => t.id === templateId);
    if (!template) {
      throw new Error(`The template ID ${templateId} does not exist`);
    }

    createAllTemplateItems(baseDirectory, template.contents);
  };
}
