import fs from 'fs';
import path from 'path';
import Constants from '../constants/constants';

/**
 * Clones the directory structure from a source directory to a target directory
 * without copying any files. Hidden directories (starting with '.') are ignored.
 * 
 * @param {string} sourceDir - The source directory to clone from
 * @param {string} targetDir - The target directory to clone to
 * @returns {Promise<void>}
 */
export const cloneDirectoryStructure = async (sourceDir, targetDir) => {
  try {
    // Create the target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Read all items in the source directory
    const items = fs.readdirSync(sourceDir);

    // Process each item
    for (const item of items) {
      // Skip hidden directories (starting with '.')
      if (item.startsWith('.')) {
        continue;
      }

      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);

      // Check if the item is a directory
      const stats = fs.statSync(sourcePath);
      if (stats.isDirectory()) {
        // Create the directory in the target
        fs.mkdirSync(targetPath, { recursive: true });
        
        // Recursively clone subdirectories
        await cloneDirectoryStructure(sourcePath, targetPath);
      }
      // We intentionally skip files as per requirements
    }
  } catch (error) {
    throw new Error(`Failed to clone directory structure: ${error.message}`);
  }
};

/**
 * Creates a new StatWrap configuration folder in the target directory
 * 
 * @param {string} targetDir - The target directory where the StatWrap project file will be created
 * @returns {Promise<void>}
 */
export const createStatWrapConfig = async (targetDir) => {
  try {
    const configDir = path.join(targetDir, Constants.StatWrapFiles.BASE_FOLDER);
    fs.mkdirSync(configDir, { recursive: true });
    
    const projectConfigFile = path.join(targetDir, Constants.StatWrapFiles.PROJECT);
    fs.writeFileSync(projectConfigFile, JSON.stringify({
      projectName: path.basename(targetDir),
      created: new Date().toISOString(),
    }, null, 2));
  } catch (error) {
    throw new Error(`Failed to create StatWrap configuration: ${error.message}`);
  }
};

/**
 * Performs the complete cloning operation.
 * 
 * @param {string} sourceDir - The source directory to clone from
 * @param {string} targetBaseDir - The base directory where the new project will be created
 * @param {string} projectName - The name of the new project
 * @returns {Promise<string>} - The path to the created project
 */
export const performCloneOperation = async (sourceDir, targetBaseDir, projectName) => {
  try {
    const targetDir = path.join(targetBaseDir, projectName);
    
    // Clone the directory structure
    await cloneDirectoryStructure(sourceDir, targetDir);
    
    // Create StatWrap configuration
    await createStatWrapConfig(targetDir);
    
    return targetDir;
  } catch (error) {
    throw error;
  }
};
