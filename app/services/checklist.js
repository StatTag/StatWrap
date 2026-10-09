import Constants from '../constants/constants';
import GeneralUtil from '../utils/general';
import ChecklistUtil from '../utils/checklist';
import { v4 as uuidv4 } from 'uuid';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

const fs = require('fs');
const os = require('os');
const path = require('path');

export default class ChecklistService {
  /**
   * Resolves the project's checklist file location.
   * @param {string} projectPath The path to the project
   * @returns {string} The path to the project's checklist file
   */
  getChecklistFilePath(projectPath) {
    return path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );
  }

  /**
   * Replaces a checklist file using a flushed temporary sibling and rename.
   * Cleans up owned temporary files on failure without overwriting the original.
   * @param {string} filePath The destination checklist file path
   * @param {object} checklist The complete versioned checklist, including unknown fields
   * @returns {undefined} Completes after the replacement succeeds
   * @throws {Error} If serialization, file creation, writing, flushing, replacement, or cleanup fails
   */
  replaceChecklistFile(filePath, checklist) {
    // Serialize before creating a file so serialization errors leave no temporary file.
    const contents = JSON.stringify(checklist);
    let mode;
    try {
      // Retain permission and special bits, excluding file-type bits; 0o666 would drop special bits.
      mode = fs.statSync(filePath).mode & 0o7777;
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
    // A sibling stays on the same filesystem, allowing rename to replace the original.
    const temporaryPath = `${filePath}.${uuidv4()}.tmp`;
    let descriptor;
    let owned = false;
    try {
      // 'wx' creates exclusively: a name collision must not overwrite someone else's file.
      descriptor = mode === undefined
        ? fs.openSync(temporaryPath, 'wx')
        : fs.openSync(temporaryPath, 'wx', mode);
      owned = true;
      fs.writeFileSync(descriptor, contents);
      if (mode !== undefined) {
        fs.fchmodSync(descriptor, mode);
      }
      // Flush file contents before replacement; close alone does not guarantee a disk flush.
      fs.fsyncSync(descriptor);
      // Close before rename for platforms that restrict renaming open files.
      fs.closeSync(descriptor);
      descriptor = undefined;
      // Rename replaces the original without exposing a partially written checklist.
      // This does not guarantee crash durability of the directory entry without a directory sync.
      fs.renameSync(temporaryPath, filePath);
      owned = false;
    } finally {
      try {
        // Release the descriptor on failure as well as success.
        if (descriptor !== undefined) {
          fs.closeSync(descriptor);
        }
      } finally {
        // Attempt cleanup even if close fails, but unlink only a temporary file we created.
        if (owned) {
          fs.unlinkSync(temporaryPath);
        }
      }
    }
  }

  /**
   * Persists a checklist and reports completed migration metadata for caller-managed logging.
   * @param {string} projectPath The path to the project
   * @param {object} checklist The complete versioned checklist
   * @param {number|null} migratedFromVersion The original format version, or null for a non-migrating save
   * @returns {object|null} The fromVersion/toVersion pair after persistence, or null if no migration occurred
   * @throws {Error} If the checklist file cannot be replaced
   */
  persistChecklistFile(projectPath, checklist, migratedFromVersion = null) {
    this.replaceChecklistFile(this.getChecklistFilePath(projectPath), checklist);
    return migratedFromVersion === null ? null
      : { fromVersion: migratedFromVersion, toVersion: checklist.version };
  }

  /**
   * Writes validated checklist data, preserving existing version and unknown metadata.
   * @param {string} projectPath The path to the project
   * @param {Array} checklistItems The updated checklist items to write
   * @returns {object|null} Persisted migration metadata (fromVersion/toVersion), or null if no migration occurred
   * @throws {Error} If the project path or checklist data is invalid or if there is an error writing the file
   */
  writeChecklist(projectPath, checklistItems) {
    if (!projectPath || !Array.isArray(checklistItems)) {
      throw new Error('Invalid project path or checklist data');
    }

    const checklistFilePath = this.getChecklistFilePath(projectPath);
    const parsed = fs.existsSync(checklistFilePath)
      ? ChecklistUtil.parseChecklistFile(JSON.parse(fs.readFileSync(checklistFilePath)))
      : { version: Constants.CHECKLIST_VERSION, checklist: [], migratedFromVersion: null };
    const { migratedFromVersion, ...checklist } = parsed;
    const existingItems = new Map(checklist.checklist.map((item) => [item.id, item]));
    const updated = checklistItems.map((item) => (
      item && typeof item === 'object' && !Array.isArray(item)
        ? { ...existingItems.get(item.id), ...item } : item
    ));
    return this.persistChecklistFile(projectPath, {
      ...checklist,
      checklist: ChecklistUtil.validateChecklist(updated),
    }, migratedFromVersion);
  }

  /**
   * Loads checklist items and persists legacy conversion or duplicate repairs before returning them.
   * @param {string} projectPath The path to the project
   * @param {function} callback Receives an error string or null, an item array or null, and optional
   * migration metadata (fromVersion/toVersion). A missing file returns an error string and an empty array.
   * @returns {undefined} Results are delivered through the callback
   */
  loadChecklist(projectPath, callback) {
    if (!projectPath) {
      callback('The project path must be specified', null);
      return;
    }

    const checklistFilePath = this.getChecklistFilePath(projectPath);
    let checklistItems;
    let migration = null;
    try {
      if (!fs.existsSync(checklistFilePath)) {
        callback('Checklist file not found', []);
        return;
      }
      const data = JSON.parse(fs.readFileSync(checklistFilePath));
      const { migratedFromVersion, ...checklist } = ChecklistUtil.parseChecklistFile(data);
      checklistItems = checklist.checklist;
      if (migratedFromVersion !== null
        || JSON.stringify(checklistItems) !== JSON.stringify(data.checklist)) {
        migration = this.persistChecklistFile(projectPath, checklist, migratedFromVersion);
      }
    } catch (err) {
      callback(`Error loading checklist file: ${err.message}`, null);
      return;
    }
    if (migration) {
      callback(null, checklistItems, migration);
    } else {
      callback(null, checklistItems);
    }
  }

  formatStatWrapScanResults(scanResult) {
    if (scanResult === null || scanResult === undefined) {
      return [];
    }

    return Object.keys(scanResult).map((key) => {
      return [
        { text: key, marginLeft: 25 },
        {
          ul:
            scanResult[key].length > 0
              ? scanResult[key].map((dep, depIndex) => dep)
              : ['No results'],
          marginLeft: 30,
        },
      ];
    });
  }

  generateReport(checklist, reportFileName, exportNotes, project) {
    // pdfMake requires base64 encoded images
    const statWrapLogo = GeneralUtil.convertImageToBase64(
      path.join(__dirname, 'images/banner.png'),
    );
    const summaryRows = checklist.flatMap((item, index) => [
      [
        { text: `${index + 1}.`, bold: true },
        { text: item.statement, bold: true },
        {
          text: item.answer ? 'Yes' : 'No',
          style: 'summaryAnswer',
          color: item.answer ? '#32704A' : '#444444',
        },
      ],
      ...(item.subChecklist || []).map((subItem, subIndex) => [
        { text: '' },
        {
          text: `${index + 1}.${subIndex + 1} ${subItem.statement}`,
          margin: [12, 0, 0, 0],
          color: '#555555',
        },
        {
          text: subItem.answer ? 'Yes' : 'No',
          style: 'summaryAnswer',
          color: subItem.answer ? '#32704A' : '#444444',
        },
      ]),
    ]);

    const documentDefinition = {
      content: [
        {
          image: statWrapLogo,
          width: 130,
          alignment: 'center',
        },
        {
          text: 'Reproducibility Checklist',
          style: 'mainHeader',
          alignment: 'center',
          margin: [0, 10, 0, 16],
        },
        {
          columns: [
            {
              text: `Project Name: ${project.name}`,
              width: '*',
            },
            {
              text: `Date: ${new Date().toLocaleDateString()}`,
              width: 'auto',
              alignment: 'right',
            },
          ],
          columnGap: 16,
          margin: [0, 0, 0, 18],
        },
        {
          table: {
            headerRows: 1,
            dontBreakRows: true,
            widths: [28, '*', 52],
            body: [
              [
                { text: '', style: 'summaryHeader' },
                { text: 'Checklist Summary', style: 'summaryHeader' },
                { text: 'Answer', style: 'summaryHeader', alignment: 'center' },
              ],
              ...summaryRows,
            ],
          },
          layout: {
            fillColor: (rowIndex) => rowIndex === 0
              ? '#EEE8F4' : rowIndex % 2 === 0 ? '#F7F7F9' : null,
            hLineWidth: () => 0.5,
            hLineColor: () => '#E2DFE7',
            vLineWidth: () => 0,
            paddingLeft: () => 8,
            paddingRight: () => 8,
            paddingTop: () => 8,
            paddingBottom: () => 8,
          },
        },

        // Heading with a page break for checklist item details
        {
          text: 'Checklist Details',
          style: 'sectionHeader',
          margin: [0, 10],
          pageBreak: 'before',
        },
        ...checklist
          .map((item, index) => {
            const maxWidth = 450;
            let subChecklist = [];
            if (item.subChecklist && item.subChecklist.length > 0) {
              subChecklist = item.subChecklist.map((subItem, subIndex) => ({
                columns: [
                  {
                    text: `${index + 1}.${subIndex + 1} ${subItem.statement}`,
                    margin: [15, 5],
                    width: '*',
                    alignment: 'left',
                  },
                  {
                    text: subItem.answer ? 'Yes' : 'No',
                    margin: [0, 5, 25, 0],
                    alignment: 'right',
                  },
                ],
                columnGap: 0,
              }));
            }

            let notes = [];
            if (exportNotes && item.notes && item.notes.length > 0) {
              notes = item.notes.map((note, noteIndex) => ({
                text: `${noteIndex + 1}. ${note.content}`,
                margin: [25, 2],
                width: maxWidth,
              }));
            }

            const scanResults = this.formatStatWrapScanResults(item.scanResult);

            let assets = [];
            if (item.assets && item.assets.length > 0) {
              assets = item.assets.map((asset, assetIndex) => {
                return {
                  unbreakable: true,
                  columns: [
                    {
                      text: `${assetIndex + 1}. `,
                      width: 30,
                      margin: [25, 1, 0, 0],
                      alignment: 'left',
                      noWrap: true,
                    },
                    {
                      stack: [
                        {
                          text: asset.name,
                          margin: [7, 1],
                          alignment: 'left',
                          style: 'hyperlink',
                          link: asset.uri,
                        },
                        {
                          text: asset.description,
                          margin: [7, 3],
                          alignment: 'left',
                        },
                      ],
                      width: maxWidth,
                    },
                  ],
                };
              });
            }

            return [
              {
                columns: [
                  {
                    text: `${index + 1}. `,
                    width: 10,
                    margin: [0, 10, 0, 0],
                    alignment: 'left',
                    bold: true,
                  },
                  {
                    text: `${item.statement}`,
                    margin: [0, 10, 5, 0],
                    width: 'auto',
                    alignment: 'left',
                    bold: true,
                  },
                  {
                    text: `(${item.answer ? 'Yes' : 'No'})`,
                    margin: [0, 10, 0, 0],
                    alignment: 'left',
                    bold: true,
                    color: item.answer ? 'green' : 'red',
                  },
                ],
                columnGap: 5,
              },
              ...(typeof item.description === 'string' && item.description.trim()
                ? [{ text: item.description, style: 'itemDescription' }] : []),
              ...subChecklist,
              scanResults.length > 0
                ? { text: 'StatWrap Defined Documentation:', style: 'itemSubHeader' }
                : '',
              ...scanResults,
              notes.length > 0 ? { text: 'Notes:', style: 'itemSubHeader' } : '',
              ...notes,
              assets.length > 0 ? { text: 'Related Assets:', style: 'itemSubHeader' } : '',
              ...assets,
              { text: '', marginBottom: 15 },
            ];
          })
          .flat(),
      ],
      styles: {
        mainHeader: { fontSize: 22, bold: true, color: '#663399' },
        sectionHeader: { fontSize: 18, bold: true, color: '#8b6fb3', margin: [0, 20] },
        summaryHeader: { fontSize: 12, bold: true, color: '#663399' },
        summaryAnswer: { bold: true, alignment: 'center' },
        itemDescription: {
          fontSize: 10,
          color: '#555555',
          margin: [15, 4, 15, 8],
          lineHeight: 1.2,
        },
        itemSubHeader: { fontSize: 12, margin: [15, 0, 15, 3] },
        hyperlink: { color: '#0000EE' },
      },
      defaultStyle: {
        fontSize: 11,
      },
      pageMargins: [40, 25, 40, 60],
      footer: function (currentPage, pageCount) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          margin: [0, 30],
        };
      },
    };

    pdfMake.createPdf(documentDefinition).download(reportFileName);
  }
}
