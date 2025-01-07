import Constants from '../constants/constants';
import GeneralUtil from '../utils/general';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const fs = require('fs');
const os = require('os');
const path = require('path');

export default class ChecklistService {
  /**
   * Writes the checklist data to the checklist file
   * @param {string} projectPath The path to the project
   * @param {object} checklist The checklist data to write
   * @throws {Error} If the project path or checklist data is invalid or if there is an error writing the file
   */
  writeChecklist(projectPath, checklist) {
    if (!projectPath || !checklist) {
      throw new Error('Invalid project path or checklist data');
    }

    // Unix-based paths may start with ~, which needs to be replaced with the home directory
    const checklistFilePath = path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    fs.writeFileSync(checklistFilePath, JSON.stringify(checklist));
  }

  /**
   * Loads the checklist data from the checklist file
   * @param {string} projectPath The path to the project
   * @param {function} callback The callback function to call with the loaded checklist data and error message
   */
  loadChecklist(projectPath, callback) {
    if (!projectPath) {
      callback('The project path must be specified', null);
      return;
    }

    // Unix-based paths may start with ~, which needs to be replaced with the home directory
    const checklistFilePath = path.join(
      projectPath.replace('~', os.homedir()),
      Constants.StatWrapFiles.BASE_FOLDER,
      Constants.StatWrapFiles.CHECKLIST,
    );

    if (!fs.existsSync(checklistFilePath)) {
      // If the checklist file does not exist, return an empty array
      // so that it doesn't display error in the UI for existing projects
      callback('Checklist file not found', []);
      return;
    }

    try {
      const data = fs.readFileSync(checklistFilePath);
      const checklist = JSON.parse(data);
      callback(null, checklist);
    } catch (err) {
      callback('Error reading or parsing checklist file', null);
    }
  }

  formatStatWrapScanResults(scanResult) {
    if (scanResult === null || scanResult === undefined) {
      return [];
    } else {
      return Object.keys(scanResult).map((key) => {
        return [
          { text: key, marginLeft: 25 },
          {
            ul: scanResult[key].length > 0 ?
              scanResult[key].map((dep, depIndex) => dep) :
              ['No results'],
            marginLeft: 30
          }
        ]
      });
    }

    return [];
  }

  generateReport(checklist, reportFileName, exportNotes, project) {
    // pdfMake requires base64 encoded images
    const checkedIcon = GeneralUtil.convertImageToBase64(path.join(__dirname, 'images/yes.png'));
    const statWrapLogo = GeneralUtil.convertImageToBase64(
      path.join(__dirname, 'images/banner.png'),
    );

    const documentDefinition = {
      content: [
        {
          image: statWrapLogo,
          width: 150,
          alignment: 'center',
        },
        {
          text: 'Reproducibility Checklist',
          style: 'mainHeader',
          alignment: 'center',
          margin: [0, 20],
        },
        {
          text: 'Project Overview',
          style: 'sectionHeader',
          margin: [0, 10],
        },
        {
          text: `Project Name: ${project.name}`,
          margin: [0, 5],
        },
        {
          text: `Date: ${new Date().toLocaleDateString()}`,
          margin: [0, 5],
        },
        {
          columns: [
            {
              text: `Checklist Summary`,
              style: 'sectionHeader',
              margin: [0, 10],
            },
            {
              text: 'Yes',
              margin: [0, 12, 5, 0],
              width: 30,
              alignment: 'right',
              fontSize: 16,
              bold: true,
              noWrap: true,
            },
            {
              text: 'No',
              margin: [0, 12],
              width: 40,
              alignment: 'right',
              fontSize: 16,
              bold: true,
              noWrap: true,
            },
          ],
        },
        // Main checklist summary items (just the checklist)
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
                  subItem.answer
                    ? {
                        image: checkedIcon,
                        width: 16,
                        alignment: 'right',
                        margin: [0, 5, 25, 0],
                      }
                    : {
                        image: checkedIcon,
                        width: 16,
                        alignment: 'right',
                        margin: [0, 5, 1, 0],
                      },
                ],
                columnGap: 0,
              }));
            }

            return [
              {
                columns: [
                  {
                    text: `${index + 1}. `,
                    width: 10,
                    margin: [0, 10],
                    alignment: 'left',
                  },
                  {
                    text: `${item.statement}`,
                    margin: [0, 10, 25, 0],
                    width: maxWidth,
                    alignment: 'left',
                    bold: true,
                  },
                  item.answer
                    ? {
                        image: checkedIcon,
                        width: 16,
                        alignment: 'right',
                        marginRight: 10,
                        marginTop: 12,
                      }
                    : {
                        image: checkedIcon,
                        width: 16,
                        marginLeft: 28,
                        marginTop: 12,
                      },
                ],
                columnGap: 5,
              },
              ...subChecklist,
            ];
          }).flat(),

          // Heading with a page break for checklist item details
          {
            text: 'Checklist Details',
            style: 'sectionHeader',
            margin: [0, 10],
		        pageBreak: 'before'
          },
          ...checklist.map((item, index) => {
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
                    alignment: 'right'
                  }
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
                    bold: true
                  },
                  {
                    text: `${item.statement}`,
                    margin: [0, 10, 25, 0],
                    width: maxWidth,
                    alignment: 'left',
                    bold: true
                  },
                  {
                    text: item.answer ? 'Yes' : 'No',
                    margin: [0, 10, 25, 0],
                    alignment: 'right',
                    color: item.answer ? 'green' : 'red'
                  }
                ],
                columnGap: 5,
              },
              ...subChecklist,
              scanResults.length > 0 ? { text: 'StatWrap Defined Documentation:', style: 'itemSubHeader' } : '',
              ...scanResults,
              notes.length > 0 ? { text: 'Notes:', style: 'itemSubHeader' } : '',
              ...notes,
              assets.length > 0 ? { text: 'Related Assets:', style: 'itemSubHeader' } : '',
              ...assets,
              { text: '', marginBottom: 15 }
            ];
          }).flat(),
      ],
      styles: {
        mainHeader: { fontSize: 22, bold: true, color: '#663399' },
        sectionHeader: { fontSize: 18, bold: true, color: '#8b6fb3', margin: [0, 20] },
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
