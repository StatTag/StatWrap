
import templateList from '../constants/project-templates.json';

const fs = require('fs');
const path = require('path');

const BLOCKED_TEMPLATE_EXTENSIONS =['.exe', '.dll', '.sh'];
const SKIPPED_TEMPLATE_EXTENSIONS =['.csv', '.png'];
const MAX_TOTAL_FOLDER_SIZE = 5*1024*1024; //5 MB MAX FOLDER SIZE

// Recursive function to get the hierarchy of files and folders in dirPath
// Derived from https://coderrocketfuel.com/article/recursively-list-all-the-files-in-a-directory-using-node-js
function getAllFiles(dirPath) {
  const files = fs.readdirSync(dirPath);
  const arrayOfFiles = [];
  files.forEach(function (file) {
    const filePath = `${dirPath}/${file}`;
    if (!templateList.ignore.includes(file)) {
      if (fs.statSync(filePath).isDirectory()) {
        arrayOfFiles.push({
          name: file,
          type: 'folder',
          path: path.join(dirPath, '/', file),
          contents: getAllFiles(filePath),
        });
      } else {
        arrayOfFiles.push({
          name: file,
          type: 'file',
          path: path.join(dirPath, '/', file),
        });
      }
    }
  });

  return arrayOfFiles;
}

//Recursive function to get the folders contents in the dirPath
function collectImportedFolderContents(
  dirPath,
  blockedExtensions,
  foundExtensions,
  statsTracker = { totalSize: 0 }
){
  const files = fs.readdirSync(dirPath);
  const arrayOfFiles = [];

  files.forEach(function (file){
    if(templateList.ignore.includes(file)){
      return;
    }

    const filePath = path.join(dirPath,file);
    const lstats = fs.lstatSync(filePath);

    if(lstats.isSymbolicLink()){
      console.log(`Ignoring symbolic link: ${filePath}`);
      return;
    }

    if(lstats.isDirectory()){
      arrayOfFiles.push({
        name: file,
        type: 'folder',
        path: path.join(dirPath,'/',file),
        contents: collectImportedFolderContents(filePath,blockedExtensions,foundExtensions,statsTracker),
      });
      return;
    }

    statsTracker.totalSize += lstats.size;
    if(statsTracker.totalSize > MAX_TOTAL_FOLDER_SIZE){
      throw new Error(`Import Aborted : Total template size exceeds the limit of 100MB`);
    }

    const extension = path.extname(file).toLowerCase();

    // Skip data files that shouldn't be part of a template
    if(SKIPPED_TEMPLATE_EXTENSIONS .includes(extension)){
      return;
    }

    if(blockedExtensions.includes(extension)){
      foundExtensions.add(extension);
      return;
    }

    arrayOfFiles.push({
      name: file,
      type: 'file',
      path: path.join(dirPath, '/', file),
    });
  });

  return arrayOfFiles;

}

// Recursively copy files to app data folder and update the JSON structure paths
function copyContentsAndUpdatePaths(contents, targetBaseDir) {
  if (!fs.existsSync(targetBaseDir)) {
    fs.mkdirSync(targetBaseDir, { recursive: true });
  }

  return contents.map((item) => {
    const newPath = path.join(targetBaseDir, item.name);
    if (item.type === 'file') {
      fs.copyFileSync(item.path, newPath);
      return { ...item, path: newPath };
    } else {
      if (!fs.existsSync(newPath)) {
        fs.mkdirSync(newPath, { recursive: true });
      }
      const newContents = copyContentsAndUpdatePaths(item.contents, newPath);
      return { ...item, path: newPath, contents: newContents };
    }
  });
}

//Function to confirm target path is strictly inside target directory i.e to prevent the path traversal
function isSafeTargetPath(baseDir, targetPath) {

  const resolvedBase = fs.existsSync(baseDir) 
    ? fs.realpathSync(baseDir) 
    : path.resolve(baseDir);

  // Normalize target path
  const resolvedTarget = path.resolve(targetPath);

  const relative = path.relative(resolvedBase, resolvedTarget);
  
  return relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// For a given template, create all of the files and folders in dirPath
// This handles recursively defined template structures.
function createAllTemplateItems(dirPath, contents, rootdirPath = dirPath) {
  contents.forEach(function (item) {
    const rootname = path.basename(item.name);
    const newPath = path.join(dirPath, rootname);

    if(!isSafeTargetPath(rootdirPath, newPath)){
      throw new Error(`Security Exception: Blocked path traversal attempt to write outside project directory.`);
    }

    if (item.type === 'file') {
      fs.copyFileSync(item.path, newPath);
    } else {
      fs.mkdirSync(newPath);
      createAllTemplateItems(newPath, item.contents, rootdirPath);
    }
  });
}

// For a given template, find the list of files and folders that have been defined
function getTemplateContents(template, templateRoot) {
  const templateDirs = fs.readdirSync(templateRoot);
  if (templateDirs && templateDirs.includes(template.id)) {
    // The template exists, now confirm that the specific version exists.
    const templateVersions = fs.readdirSync(path.join(templateRoot, template.id));
    if (templateVersions && templateVersions.includes(template.version)) {
      const fullTemplate = { ...template };
      fullTemplate.contents = getAllFiles(path.join(templateRoot, template.id, template.version));
      return fullTemplate;
    }
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
  loadProjectTemplates = (templateRoot) => {
    if (this.projectTemplates) {
      return this.projectTemplates;
    }

    const templates = [];
    templateList.templates.forEach(function (template) {
      const contents = getTemplateContents(template, templateRoot);
      if (contents) {
        templates.push(contents);
      }
    });

    this.projectTemplates = [...templates];

    return this.projectTemplates;
  };

  // Building the template from the folder
  buildTemplateFromFolder = (folderPath) =>{
    if(!folderPath){
      throw new Error('You must specify a folder to import');
    }

    try{
      fs.accessSync(folderPath);
    }catch(err){
      throw new Error(`The folder ${folderPath} does not exist`);
    }

    const foundExtensions = new Set();
    const contents = collectImportedFolderContents(
      folderPath,
      BLOCKED_TEMPLATE_EXTENSIONS,
      foundExtensions,
    );

    return{
      template: {
        id: 'STATWRAP-CUSTOM',
        version: '1',
        name: path.basename(folderPath, '.zip'),
        contents,
      },
      blockedExtensions: Array.from(foundExtensions).sort(),
    };
  };

  createTemplateContentsFromContents = (baseDirectory, contents) => {
    if(!baseDirectory){
      throw new Error('You must specify a base directory to create the template in');
    }

    try{
      fs.accessSync(baseDirectory);
    }catch(err){
      throw new Error(`The base directory ${baseDirectory} does not exist`);
    }

    if(!contents || !Array.isArray(contents)){
      throw new Error('You must provide template contents');
    }

    createAllTemplateItems(baseDirectory,contents);
  }

  // Instantiate baseDirectory (assumed to be the root of the project we want the
  // template created in) with all files and folders stored in the template identified
  // by templateId
  createTemplateContents = (baseDirectory, templateId, templateVersion) => {
    if (!baseDirectory) {
      throw new Error(`You must specify a base directory to create the template in`);
    }

    try {
      fs.accessSync(baseDirectory);
    } catch (err) {
      throw new Error(`The base directory ${baseDirectory} does not exist`);
    }

    if (!templateId) {
      throw new Error(`You must specify the template ID to create`);
    }
    if (!templateVersion) {
      throw new Error('You must specify the version of the template to create');
    }
    const template = this.projectTemplates.find(
      (t) => t.id === templateId && t.version === templateVersion,
    );
    if (!template) {
      throw new Error(`The template ID ${templateId} ${templateVersion} does not exist`);
    }

    createAllTemplateItems(baseDirectory, template.contents);
  };

  /**
   * Save a custom template definition to disk.
   * Each template is saved as a JSON file named by its ID.
   */
  saveCustomTemplate = (customTemplatesDir, template) => {
    if (!fs.existsSync(customTemplatesDir)) {
      fs.mkdirSync(customTemplatesDir, { recursive: true });
    }

    // Copy template files to a permanent directory inside appData
    const permanentFilesDir = path.join(customTemplatesDir, 'files', template.id);
    const updatedContents = copyContentsAndUpdatePaths(template.contents, permanentFilesDir);

    const templateToSave = {
      ...template,
      contents: updatedContents,
      isCustom: true,
    };

    const filePath = path.join(customTemplatesDir, `${template.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(templateToSave, null, 2), 'utf-8');
    return templateToSave;
  };

  /***
   * Load all the custom templates from the custom-templates directory.
   */

  loadCustomTemplates = (customTemplatesDir) => {
    if(!fs.existsSync(customTemplatesDir)){
      return [];
    }

    const files = fs.readdirSync(customTemplatesDir).filter((f)=> f.endsWith('.json'));
    const templates = [];

    files.forEach((file) => {
      try{
        const content = fs.readFileSync(path.join(customTemplatesDir, file), 'utf-8');
        const template = JSON.parse(content);
        template.isCustom = true;
        templates.push(template);
      }catch(e){
        console.log(`Failed to load custom template ${file}:`, e);
      }
    });

    return templates;
  };

  /**
   * Merge the custom templates into the cached lsit so they appear
   * alongside the hardcoded ones.
   */

  mergeCustomTemplates = (customTemplates) => {
    if(!this.projectTemplates){
      this.projectTemplates =[];
    }

    this.projectTemplates = this.projectTemplates.filter((f) => !f.isCustom);
    this.projectTemplates.push(...customTemplates);
    return this.projectTemplates;

  }


  /**
   * Delete a custom template from disk.
   */

  deleteCustomTemplate = (customTemplatesDir, templateId) => {
    const filePath = path.join(customTemplatesDir, `${templateId}.json`);
    if(fs.existsSync(filePath)){
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  };

  /**
   * Export a custom template
   */
  exportCustomTemplate = (customTemplatesDir, templateId, exportPath) => {
  const AdmZip = require('adm-zip');
  const zip = new AdmZip();
  // 1. Add the template's associated files directly into the ZIP root
  const filesDir = path.join(customTemplatesDir, 'files', templateId);
  if (fs.existsSync(filesDir)) {
    zip.addLocalFolder(filesDir, "");
  }
  // 2. Write the ZIP buffer to the exportPath
  zip.writeZip(exportPath);
};

}
