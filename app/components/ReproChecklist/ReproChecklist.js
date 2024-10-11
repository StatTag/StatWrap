import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ReproChecklist.css';
import ChecklistItem from './ChecklistItem';
import { Typography, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import { SaveAlt } from '@mui/icons-material';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const path = require('path');
const fs = require('fs');
const AssetsConfig = require('../../constants/assets-config');

const reproducibilityChecklist = [
  {
    id: '1',
    statement: 'First checklist item statement. Now, I am just trying to make this statement a bit longer to see how it looks in the UI, without making any sense.',
    answer: true,
    scanResult: {},
    userNotes: [],
    attachedImages: [],
    attachedURLs: [],
    subChecklist: [],
  },
  {
    id: '2',
    statement: 'Second checklist item statement.',
    answer: false,
    scanResult: {},
    userNotes: [],
    attachedImages: [],
    attachedURLs: [],
    subChecklist: [],
  },
  {
    id: '3',
    statement: 'List of all the languages used and the dependencies of the project.',
    answer: true,
    scanResult: {},
    userNotes: [],
    attachedImages: [],
    attachedURLs: [],
    subChecklist:[
      {
        id: '3.1',
        statement: 'Are all the languages used in the project listed?',
        answer: true,
      },
      {
        id: '3.2',
        statement: 'Are all the dependencies of the project listed?',
        answer: false,
      },
    ],
  }
];

const languages = {};
const dependencies = {};
const imageAssets = {};

function findAssetLanguagesAndDependencies(asset) {
  if (asset.type === 'file' && asset.contentTypes.includes('code') ) {
    const lastSep = asset.uri.lastIndexOf(path.sep);
    const fileName = asset.uri.substring(lastSep + 1);
    const ext = fileName.split('.').pop();
    if(ext){
      AssetsConfig.contentTypes.forEach((contentType) => {
        if(contentType.extensions.includes(ext)) {
          languages[contentType.name] = true;
        }
      });
    }
  }

  if(asset.children){
    asset.children.forEach(findAssetLanguagesAndDependencies);
  }

  reproducibilityChecklist[2].scanResult = {
    languages: Object.keys(languages),
    dependencies: Object.keys(dependencies)
  };
}

function findImageAssets(asset) {
  if (asset.type === 'file' && asset.contentTypes.includes('image')) {
    imageAssets[asset.uri] = true;
  }
  if (asset.children) {
    asset.children.forEach(findImageAssets);
  }
};

function findChecklistNotes(notes) {
  const checklistNotes = {};
  notes.forEach((note) => {
    if (note.content.startsWith('Checklist') && note.content.includes(':')) {
      const id = note.content.split(':')[0].split(' ')[1];
      if (!checklistNotes[id]) {
        checklistNotes[id] = [];
      }
      const checklistNote = {
        id: note.id,
        author: note.author,
        updated: note.updated,
        content: note.content.split(':')[1].trim(),
      };
      checklistNotes[id].push(checklistNote);
    }
  });
  return checklistNotes;
}


function convertImageToBase64(filePath) {
  try {
    const file = fs.readFileSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    let mimeType;
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.gif':
        mimeType = 'image/gif';
        break;
      case '.webp':
        mimeType = 'image/webp';
        break;
      case '.svg':
        mimeType = 'image/svg+xml';
        break;
      default:
        mimeType = 'application/octet-stream';
    }
    return `data:${mimeType};base64,${file.toString('base64')}`;
  } catch (error) {
    console.error('Error converting image to Base64:', error);
    return null;
  }
};


function ReproChecklist(props) {
  const { project, checklist, error, onUpdatedNote, onDeletedNote, onAddedNote, onSelectedAsset} = props;
  const [checklistItems, setChecklistItems] = useState(checklist);
  const [allImages, setAllImages] = useState([]);
  const [openExportDialog, setOpenExportDialog] = useState(false);

  useEffect(() => {
    if (project) {
      if(project.assets) {
        findAssetLanguagesAndDependencies(project.assets);
        findImageAssets(project.assets);
        setAllImages(Object.keys(imageAssets));
      }
      if(project.notes){
        const checklistNotes = findChecklistNotes(project.notes);
        const updatedChecklistItems = checklistItems.map((item) => {
          if (checklistNotes[item.id]) {
            return {
              ...item,
              userNotes: checklistNotes[item.id],
            };
          }
          return item;
        });
        setChecklistItems(updatedChecklistItems);
      }
    }
  }, [project]);

  const handleItemUpdate = (updatedItem) => {
    const updatedChecklistItems = checklistItems.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setChecklistItems(updatedChecklistItems);
  };

  const handleReportGeneration = (exportNotes) => {
    const checkedIcon = convertImageToBase64(path.join(__dirname, 'images/yes.png'));
    const statWrapLogo = convertImageToBase64(path.join(__dirname, 'images/banner.png'));

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
        ...checklistItems.map((item, index) => {
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
                subItem.answer ? {
                  image: checkedIcon,
                  width: 15,
                  alignment: 'right',
                  margin: [0, 5, 25, 0],
                } : {
                  image: checkedIcon,
                  width: 15,
                  alignment: 'right',
                  margin: [0, 5, 1, 0],
                },
              ],
              columnGap: 0,
            }));
          }

          let notes = [];
          if (exportNotes && item.userNotes && item.userNotes.length > 0) {
            notes = item.userNotes.map((note, noteIndex) => ({
              text: `${noteIndex + 1}. ${note.content}`,
              margin: [20, 2],
              width: maxWidth,
            }));
          }

          let images = [];
          const imageWidth = 135;
          if(item.attachedImages && item.attachedImages.length > 0){
            images = item.attachedImages.map((image) => {
              const base64Image = convertImageToBase64(image.uri);
              if (base64Image) {
                return {
                  image: base64Image,
                  width: imageWidth,
                  margin: [0, 5],
                  alignment: 'center',
                };
              }
              return { text: `Failed to load image: ${image.uri}`, color: 'red' };
            });
          }

          // imageWidth*n + calumnGap*(n-1) <= maxWidth - leftMargin - rightMargin
          // 135*n + 10*(n-1) <= 450 - 20 - 0;
          // n <= 440/145 --> n = 3
          const imagesPerRow = Math.floor((maxWidth - 20 + 10) / (imageWidth + 10));

          let imageRows = [];
          for (let i = 0; i < images.length; i += imagesPerRow) {
            imageRows.push({
              columns: images.slice(i, i + imagesPerRow),
              columnGap: 10,
              margin: [20, 5],
            });
          }

          let urls = [];
          if(item.attachedURLs && item.attachedURLs.length > 0){
            urls = item.attachedURLs.map((url, urlIndex) => {
              return {
                unbreakable: true,
                columns: [
                  {
                    text: `${urlIndex + 1}. `,
                    width: 25,
                    margin: [20, 1 , 0, 0],
                    alignment: 'left',
                    noWrap: true,
                  },
                  {
                    stack: [
                      {
                        text: url.title,
                        margin: [7, 1],
                        alignment: 'left',
                        style: 'hyperlink',
                        link: url.hyperlink,
                      },
                      {
                        text: url.description,
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
                item.answer ? {
                  image: checkedIcon,
                  width: 15,
                  alignment: 'right',
                  marginRight: 10,
                  marginTop: 12,
                } : {
                  image: checkedIcon,
                  width: 15,
                  marginLeft: 28,
                  marginTop: 12,
                },
              ],
              columnGap: 5,
            },
            ...subChecklist,
            notes.length > 0 ? { text: 'Notes:', margin: [15, 5] } : '',
            ...notes,
            images.length > 0 ? { text: 'Related Images:', margin: [15, 10] } : '',
            ...imageRows,
            urls.length > 0 ? { text: 'Related URLs:', margin: [15, 10] } : '',
            ...urls,
          ];
        }).flat(),
      ],
      styles: {
        mainHeader: { fontSize: 22, bold: true, color: '#663399' },
        sectionHeader: { fontSize: 18, bold: true, color: '#8b6fb3', margin: [0, 20] },
        hyperlink: { color: '#0000EE' },
      },
      defaultStyle: {
        fontSize: 12,
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

    pdfMake.createPdf(documentDefinition).download('Reproducibility_Checklist.pdf');
    setOpenExportDialog(false);
  };

  return (
    <div>
      <Typography variant='h5' align='center' marginTop='10px'>Reproducibility Checklist</Typography>
      <br />
      {checklistItems.map(item => (
        <ChecklistItem
          key={item.id}
          item={item}
          project={project}
          imageAssets={allImages}
          onUpdatedNote={onUpdatedNote}
          onDeletedNote={onDeletedNote}
          onAddedNote={onAddedNote}
          onItemUpdate={handleItemUpdate}
          onSelectedAsset={onSelectedAsset}
        />
      ))}
      <br />
      <div className={styles.downloadContainer}>
        <button
          onClick={() => setOpenExportDialog(true)}
          className={styles.downloadButton}
        >
          <div className={styles.buttonContent}>
            <span className={styles.buttonText}>Report</span>
            <SaveAlt />
          </div>
        </button>
      </div>

      <Dialog open={openExportDialog} onClose={() => setOpenExportDialog(false)}>
        <DialogTitle className={styles.dialogTitle}>Export Report</DialogTitle>
        <DialogContent className={styles.dialogContent}>
          <DialogContentText>
            Do you want to include the checklist notes in the exported reproducibility checklist?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => handleReportGeneration(true)} color="primary">
            Yes
          </Button>
          <Button onClick={() => handleReportGeneration(false)} color="primary" autoFocus>
            No
          </Button>
        </DialogActions>
      </Dialog>

    </div>
  );
}

ReproChecklist.propTypes = {
  project: PropTypes.object.isRequired,
  checklist: PropTypes.arrayOf(PropTypes.object),
  error: PropTypes.string,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
  onSelectedAsset: PropTypes.func.isRequired,
};

ReproChecklist.defaultProps = {
  checklist: reproducibilityChecklist,
};

export default ReproChecklist;
