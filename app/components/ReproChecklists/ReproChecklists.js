import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ReproChecklists.css';
import ChecklistItem from './ChecklistItem';
import { Typography } from '@mui/material';
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
    subChecklists: [],
  },
  {
    id: '2',
    statement: 'Second checklist item statement.',
    answer: false,
    scanResult: {},
    userNotes: [],
    attachedImages: [],
    attachedURLs: [],
    subChecklists: [],
  },
  {
    id: '3',
    statement: 'List of all the languages used and the dependencies of the project.',
    answer: true,
    scanResult: {},
    userNotes: [],
    attachedImages: [],
    attachedURLs: [],
    subChecklists:[
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

function findChecklistNotesFromProject(project) {
  const checklistNotes = {};
  project.notes.forEach((note) => {
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


function ReproChecklists(props) {
  const { project, reproChecklist, onUpdatedNote, onDeletedNote, onAddedNote } = props;
  const [checklistItems, setChecklistItems] = useState(reproducibilityChecklist);
  const [allImages, setAllImages] = useState([]);

  useEffect(() => {
    if (project && project.assets) {
      findAssetLanguagesAndDependencies(project.assets);
      findImageAssets(project.assets);
      const checklistNotes = findChecklistNotesFromProject(project);
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
      setAllImages(Object.keys(imageAssets));
    }
  }, [project]);

  const handleItemUpdate = (updatedItem) => {
    const updatedChecklistItems = checklistItems.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    setChecklistItems(updatedChecklistItems);
  };

  const handleReportGeneration = () => {
    const checkedIcon = convertImageToBase64(path.join(__dirname, 'images/yes.png'));
    const uncheckedIcon = convertImageToBase64(path.join(__dirname, 'images/no.png'));
    const statWrapLogo = convertImageToBase64(path.join(__dirname, 'images/banner.png'));

    const documentDefinition = {
      content: [
        {
          image: statWrapLogo,
          width: 150,
          alignment: 'center',
        },
        {
          text: 'Reproducibility Checklists Report',
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
          text: `Checklist Summary`,
          style: 'sectionHeader',
          margin: [0, 10],
        },
        ...checklistItems.map((item, index) => {
          let subChecklists = [];
          if (item.subChecklists && item.subChecklists.length > 0) {
            subChecklists = item.subChecklists.map((subItem, subIndex) => ({
              columns: [
                {
                  text: `${index + 1}.${subIndex + 1} ${subItem.statement}`,
                  margin: [15, 5],
                  width: '*',
                  alignment: 'left',
                },
                {
                  image: subItem.answer ? checkedIcon : uncheckedIcon,
                  width: 15,
                  height: 15,
                  alignment: 'right',
                  margin: [0, 6, 1, 0],
                },
              ],
              columnGap: 0,
            }));
          }

          let images = [];
          if(item.attachedImages && item.attachedImages.length > 0){
            images = item.attachedImages.map((image) => {
              const base64Image = convertImageToBase64(image.uri);
              if (base64Image) {
                return [
                  {
                    image: base64Image,
                    width: 150,
                    margin: [0, 5],
                    alignment: 'center',
                  },
                  {
                    text: `${image.title}`,
                    style: 'imageTitle',
                    margin: [0, 2],
                    alignment: 'center',
                  },
                ];
              }
              return { text: `Failed to load image: ${image.uri}`, color: 'red' };
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
                  margin: [0, 10],
                  width: '*',
                  alignment: 'left',
                },
                {
                  image: item.answer ? checkedIcon : uncheckedIcon,
                  width: 20,
                  height: 20,
                  alignment: 'right',
                  margin: [0, 10],
                },
              ],
              columnGap: 5,
            },
            ...subChecklists,
            images.length > 0 ? { text: 'Related Images:', style: 'subheader', margin: [0, 10] } : '',
            {
              columns: images,
              columnGap: 5,
              width: '*',
              wrap: true,
              margin: [0, 5],
            }
          ];
        }).flat(),
      ],
      styles: {
        mainHeader: { fontSize: 22, bold: true, color: '#663399' },
        sectionHeader: { fontSize: 18, bold: true, color: '#8b6fb3', margin: [0, 20] },
        header: { fontSize: 16, bold: true },
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

    pdfMake.createPdf(documentDefinition).download('Reproducibility_Checklist_Report.pdf');
  };

  return (
    <div>
      <Typography variant='h5' align='center' marginTop='10px'>Reproducibility Checklists</Typography>
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
        />
      ))}
      <br />
      <div className={styles.downloadContainer}>
        <button
          onClick={handleReportGeneration}
          className={styles.downloadButton}
        >
          <div className={styles.buttonContent}>
            <span className={styles.buttonText}>Report</span>
            <SaveAlt />
          </div>
        </button>
      </div>
    </div>
  );
}

ReproChecklists.propTypes = {
  project: PropTypes.object.isRequired,
  reproChecklist: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      statement: PropTypes.string.isRequired,
      answer: PropTypes.bool.isRequired,
      scanResult: PropTypes.objectOf(
        PropTypes.arrayOf(PropTypes.string)
      ),
      userNotes: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          author: PropTypes.string.isRequired,
          updated: PropTypes.string.isRequired,
          content: PropTypes.string.isRequired,
        })
      ),
      attachedImages: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          uri: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          updated: PropTypes.string.isRequired,
        })
      ),
      attachedURLs: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          hyperlink: PropTypes.string.isRequired,
          title: PropTypes.string.isRequired,
          description: PropTypes.string.isRequired,
          updated: PropTypes.string.isRequired,
        })
      ),
      subChecklists: PropTypes.arrayOf(
        PropTypes.shape({
          id: PropTypes.string.isRequired,
          statement: PropTypes.string.isRequired,
          answer: PropTypes.bool.isRequired,
        })
      ),
    })
  ).isRequired,
  imageAssets: PropTypes.arrayOf(PropTypes.string),
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
};

ReproChecklists.defaultProps = {
  reproChecklist: reproducibilityChecklist,
};

export default ReproChecklists;
