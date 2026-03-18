import BaseCodeHandler from './baseCode';
import Constants from '../../../constants/constants';

const FILE_EXTENSION_LIST = ['sql'];

export default class SQLHandler extends BaseCodeHandler {
  static id = 'StatWrap.SQLHandler';

  constructor() {
    super(SQLHandler.id, FILE_EXTENSION_LIST);
  }

  id() {
    return SQLHandler.id;
  }

  // SQL don't have additional libraries

  getLibraries(uri, text) {
    return [];
  }

  // Detect tables that are being READ from in SQL statements.

  getInputs(uri, text) {
    const inputs = [];
    if (!text || text.trim() === '') {
      return inputs;
    }

    const processedTables = new Set();

    // Remove SQL comments to avoid false matches
    const cleanedText = text
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // Match FROM table_name 
    const fromMatches = [
      ...cleanedText.matchAll(/\bFROM\s+(?!\s*\()([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < fromMatches.length; index++) {
      const tableName = fromMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        inputs.push({
          id: `SELECT FROM - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // Match JOIN table_name 
    const joinMatches = [
      ...cleanedText.matchAll(/\bJOIN\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < joinMatches.length; index++) {
      const tableName = joinMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        inputs.push({
          id: `JOIN - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // DIALECT FILE READS

    // PostgreSQL / Redshift: COPY table_name FROM 'filename'
    // Snowflake: COPY INTO table_name FROM 'filename'
    const copyFromMatches = [
      ...cleanedText.matchAll(/\bCOPY\s+(?:INTO\s+)?[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?\s+FROM\s+['"]([^'"]+)['"]/gim),
    ];
    for (let index = 0; index < copyFromMatches.length; index++) {
      const fileName = copyFromMatches[index][1].trim();
      inputs.push({
        id: `File Read (COPY) - ${fileName}`,
        type: Constants.DependencyType.DATA,
        path: `"${fileName}"`,
      });
    }

    // Snowflake Reverse COPY: COPY INTO 'filename' FROM table_name (Table is the input)
    const copyIntoFileMatches = [
      ...cleanedText.matchAll(/\bCOPY\s+INTO\s+['"][^'"]+['"]\s+FROM\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < copyIntoFileMatches.length; index++) {
      const tableName = copyIntoFileMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        inputs.push({
          id: `Table Read (COPY TO FILE) - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // PostgreSQL Reverse COPY: COPY table_name TO 'filename' (Table is the input)
    const copyToMatches = [
      ...cleanedText.matchAll(/\bCOPY\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)\s+TO\s+['"][^'"]+['"]/gim),
    ];
    for (let index = 0; index < copyToMatches.length; index++) {
      const tableName = copyToMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        inputs.push({
          id: `Table Read (COPY TO FILE) - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // MySQL: LOAD DATA INFILE 'filename'
    const loadDataMatches = [
      ...cleanedText.matchAll(/\bLOAD\s+DATA\s+(?:LOCAL\s+)?INFILE\s+['"]([^'"]+)['"]/gim),
    ];
    for (let index = 0; index < loadDataMatches.length; index++) {
      const fileName = loadDataMatches[index][1].trim();
      inputs.push({
        id: `File Read (LOAD DATA) - ${fileName}`,
        type: Constants.DependencyType.DATA,
        path: `"${fileName}"`,
      });
    }

    // SQL Server: BULK INSERT table_name FROM 'filename'
    const bulkInsertMatches = [
      ...cleanedText.matchAll(/\bBULK\s+INSERT\s+[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?\s+FROM\s+['"]([^'"]+)['"]/gim),
    ];
    for (let index = 0; index < bulkInsertMatches.length; index++) {
      const fileName = bulkInsertMatches[index][1].trim();
      inputs.push({
        id: `File Read (BULK INSERT) - ${fileName}`,
        type: Constants.DependencyType.DATA,
        path: `"${fileName}"`,
      });
    }

    return inputs;
  }

  // Detect tables that are being written to in SQL statements, Which includes INSERT INTO, CREATE TABLE, UPDATE, DELETE FROM, DROP TABLE, ALTER TABLE, SELECT INTO

  getOutputs(uri, text) {
    const outputs = [];
    if (!text || text.trim() === '') {
      return outputs;
    }

    const processedTables = new Set();

    // Remove SQL comments to avoid false matches
    const cleanedText = text
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');

    // INSERT INTO table_name
    const insertMatches = [
      ...cleanedText.matchAll(/\bINSERT\s+INTO\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < insertMatches.length; index++) {
      const tableName = insertMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `INSERT INTO - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // CREATE TABLE table_name
    const createMatches = [
      ...cleanedText.matchAll(/\bCREATE\s+(?:TEMP(?:ORARY)?\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < createMatches.length; index++) {
      const tableName = createMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `CREATE TABLE - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // UPDATE table_name
    const updateMatches = [
      ...cleanedText.matchAll(/\bUPDATE\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < updateMatches.length; index++) {
      const tableName = updateMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `UPDATE - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // DELETE FROM table_name
    const deleteMatches = [
      ...cleanedText.matchAll(/\bDELETE\s+FROM\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < deleteMatches.length; index++) {
      const tableName = deleteMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `DELETE FROM - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // DROP TABLE table_name
    const dropMatches = [
      ...cleanedText.matchAll(/\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < dropMatches.length; index++) {
      const tableName = dropMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `DROP TABLE - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // ALTER TABLE table_name
    const alterMatches = [
      ...cleanedText.matchAll(/\bALTER\s+TABLE\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < alterMatches.length; index++) {
      const tableName = alterMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `ALTER TABLE - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // DIALECT FILE WRITES 

    // PostgreSQL / Redshift: COPY table_name FROM 'filename'
    // Snowflake: COPY INTO table_name FROM 'filename' (Table is the output)
    const copyFromTableMatches = [
      ...cleanedText.matchAll(/\bCOPY\s+(?:INTO\s+)?([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)\s+FROM\s+['"][^'"]+['"]/gim),
    ];
    for (let index = 0; index < copyFromTableMatches.length; index++) {
      const tableName = copyFromTableMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `Table Write (COPY FROM) - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // Snowflake Reverse COPY: COPY INTO 'filename' FROM table_name (File is the output)
    const copyIntoFileOutMatches = [
      ...cleanedText.matchAll(/\bCOPY\s+INTO\s+['"]([^'"]+)['"]\s+FROM\s+[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?/gim),
    ];
    for (let index = 0; index < copyIntoFileOutMatches.length; index++) {
      const fileName = copyIntoFileOutMatches[index][1].trim();
      outputs.push({
        id: `File Write (COPY INTO) - ${fileName}`,
        type: Constants.DependencyType.DATA,
        path: `"${fileName}"`,
      });
    }

    // PostgreSQL Reverse COPY: COPY table_name TO 'filename' (File is the output)
    const copyToOutMatches = [
      ...cleanedText.matchAll(/\bCOPY\s+[a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?\s+TO\s+['"]([^'"]+)['"]/gim),
    ];
    for (let index = 0; index < copyToOutMatches.length; index++) {
      const fileName = copyToOutMatches[index][1].trim();
      outputs.push({
        id: `File Write (COPY TO) - ${fileName}`,
        type: Constants.DependencyType.DATA,
        path: `"${fileName}"`,
      });
    }

    // MySQL: LOAD DATA INFILE 'filename' INTO TABLE table_name
    const loadDataTableMatches = [
      ...cleanedText.matchAll(/\bLOAD\s+DATA\s+(?:LOCAL\s+)?INFILE\s+['"][^'"]+['"]\s+INTO\s+TABLE\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)/gim),
    ];
    for (let index = 0; index < loadDataTableMatches.length; index++) {
      const tableName = loadDataTableMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `Table Write (LOAD DATA) - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    // SQL Server: BULK INSERT table_name FROM 'filename'
    const bulkInsertTableMatches = [
      ...cleanedText.matchAll(/\bBULK\s+INSERT\s+([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)?)\s+FROM\s+['"][^'"]+['"]/gim),
    ];
    for (let index = 0; index < bulkInsertTableMatches.length; index++) {
      const tableName = bulkInsertTableMatches[index][1].trim();
      if (!processedTables.has(tableName.toLowerCase())) {
        outputs.push({
          id: `Table Write (BULK INSERT) - ${tableName}`,
          type: Constants.DependencyType.DATA,
          path: tableName,
        });
        processedTables.add(tableName.toLowerCase());
      }
    }

    return outputs;
  }
}