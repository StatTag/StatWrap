import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

const FILE_EXTENSION_LIST = ['java'];

export default class JavaHandler extends BaseCodeHandler {
  static id = 'StatWrap.JavaHandler';

  constructor() {
    super(JavaHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return JavaHandler.id;
  }

  getLibraryId(packageName, importName) {
    let id = '';
    if (packageName && importName) {
      id = `${packageName}.${importName}`;
    } else if (packageName) {
      id = packageName;
    } else if (importName) {
      id = importName;
    } else {
      id = '(unknown)';
    }
    return id;
  }

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    // For file read operations
    const fileReadMatches = [
      ...text.matchAll(/new\s+(FileInputStream|FileReader|BufferedReader|Scanner)\s*\(\s*(?:new\s+File\s*\(\s*)?(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/Files\.(?:read|readAllLines|readAllBytes|newBufferedReader|newInputStream)\s*\(\s*(?:Paths\.get\s*\(\s*)?(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];

    for (let index = 0; index < fileReadMatches.length; index++) {
      const match = fileReadMatches[index];
      const operation = match[1] || 'Files.read';
      const path = match.length > 2 ? match[2].trim() : match[1].trim();
      inputs.push({
        id: `${operation} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    // For database operations
    const jdbcMatches = [
      ...text.matchAll(/DriverManager\.getConnection\s*\(\s*(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];

    for (let index = 0; index < jdbcMatches.length; index++) {
      const match = jdbcMatches[index];
      const path = match[1].trim();
      inputs.push({
        id: `JDBC - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    return inputs;
  }

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    // For file write operations
    const fileWriteMatches = [
      ...text.matchAll(/new\s+(FileOutputStream|FileWriter|BufferedWriter|PrintWriter)\s*\(\s*(?:new\s+File\s*\(\s*)?(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/Files\.(?:write|writeString|newBufferedWriter|newOutputStream)\s*\(\s*(?:Paths\.get\s*\(\s*)?(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];

    for (let index = 0; index < fileWriteMatches.length; index++) {
      const match = fileWriteMatches[index];
      const operation = match[1] || 'Files.write';
      const path = match.length > 2 ? match[2].trim() : match[1].trim();
      outputs.push({
        id: `${operation} - ${path}`,
        type: Constants.DependencyType.DATA,
        path,
      });
    }

    // For image write operations
    const imageWriteMatches = [
      ...text.matchAll(/ImageIO\.write\s*\(\s*[\s\S]*?,\s*['"]{1,}[\s\S]+?['"]{1,}\s*,\s*(?:new\s+File\s*\(\s*)?(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];

    for (let index = 0; index < imageWriteMatches.length; index++) {
      const match = imageWriteMatches[index];
      const path = match[1].trim();
      outputs.push({
        id: `ImageIO.write - ${path}`,
        type: Constants.DependencyType.FIGURE,
        path,
      });
    }

    // For chart export operations
    const chartExportMatches = [
      ...text.matchAll(/ChartUtilities\.saveChartAs(?:JPEG|PNG)\s*\(\s*[\s\S]*?,\s*(?:new\s+File\s*\(\s*)?(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
      ...text.matchAll(/ChartUtils\.saveChartAs(?:JPEG|PNG)\s*\(\s*[\s\S]*?,\s*(?:new\s+File\s*\(\s*)?(['"]{1,}\s*?[\s\S]+?['"]{1,})[\s\S]*?\)/gim),
    ];

    for (let index = 0; index < chartExportMatches.length; index++) {
      const match = chartExportMatches[index];
      const path = match[1].trim();
      outputs.push({
        id: `Chart Export - ${path}`,
        type: Constants.DependencyType.FIGURE,
        path,
      });
    }

    return outputs;
  }

  getLibraries(uri, text) {
    const libraries = [];
    if (!text || text.trim() === '') {
      return libraries;
    }

    const packageMatches = [
      ...text.matchAll(/package\s+([\w.]+)\s*;/gm),
    ];

    let currentPackage = '';
    if (packageMatches.length > 0) {
      currentPackage = packageMatches[0][1];
    }

    const importMatches = [
      ...text.matchAll(/import\s+(?:static\s+)?([^;]+)\s*;/gm),
    ];

    for (let index = 0; index < importMatches.length; index++) {
      const match = importMatches[index];
      const fullImport = match[1].trim();

      let packageName, className;
      const lastDotIndex = fullImport.lastIndexOf('.');

      if (lastDotIndex !== -1) {
        packageName = fullImport.substring(0, lastDotIndex);
        className = fullImport.substring(lastDotIndex + 1);
      } else {
        packageName = fullImport;
        className = '*';
      }


      libraries.push({
        id: this.getLibraryId(packageName, className),
        module: packageName,
        import: className,
        alias: null,
      });
    }

    return libraries;
  }
}
