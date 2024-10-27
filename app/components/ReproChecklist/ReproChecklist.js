import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './ReproChecklist.css';
import ChecklistItem from './ChecklistItem/ChecklistItem';
import Error from '../Error/Error';
import {
  Typography,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import { SaveAlt } from '@mui/icons-material';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import GeneralUtil from '../../utils/general';
import ChecklistUtil from '../../utils/checklist';
import AssetUtil from '../../utils/asset';

pdfMake.vfs = pdfFonts.pdfMake.vfs;

const path = require('path');

function ReproChecklist(props) {
  const {
    project,
    checklist,
    error,
    onUpdated,
    onAddedNote,
    onUpdatedNote,
    onDeletedNote,
    onSelectedAsset,
  } = props;
  const [openExportDialog, setOpenExportDialog] = useState(false);

  // this useEffect hook is here to load the scan results for all the checklist statements
  useEffect(() => {
    if (project && checklist && !error) {
      if (project.assets) {
        // scan result for the first checklist statement
        const scanResult1 = ChecklistUtil.findAssetLanguagesAndDependencies(project.assets);
        const scanResult2 = ChecklistUtil.findDataFiles(project.assets);
        const scanResult3 = ChecklistUtil.findEntryPointFiles(
          AssetUtil.findEntryPointAssets(project.assets),
        );
        const scanResult4 = ChecklistUtil.findDocumentationFiles(project.assets);
        checklist[0].scanResult = scanResult1;
        checklist[1].scanResult = scanResult2;
        checklist[2].scanResult = scanResult3;
        checklist[3].scanResult = scanResult4;
      }
    }
  }, [project]);

  // Handles the update of checklist for changes in the checklist items
  const handleItemUpdate = (updatedItem) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === updatedItem.id ? updatedItem : item,
    );
    onUpdated(project, updatedChecklist);
  };

  // Handles the generation of the reproducibility checklist report in PDF format
  const handleReportGeneration = (exportNotes) => {
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
                        width: 15,
                        alignment: 'right',
                        margin: [0, 5, 25, 0],
                      }
                    : {
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
            if (exportNotes && item.notes && item.notes.length > 0) {
              notes = item.notes.map((note, noteIndex) => ({
                text: `${noteIndex + 1}. ${note.content}`,
                margin: [20, 2],
                width: maxWidth,
              }));
            }

            let images = [];
            const imageWidth = 135;
            if (item.images && item.images.length > 0) {
              images = item.images.map((image) => {
                const base64Image = GeneralUtil.convertImageToBase64(image.uri);
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

            // Rendering images by rows, as rendering in columns overflows the page and we can't wrap columns under each other,
            // math for 3 images per row is as follows:
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
            if (item.urls && item.urls.length > 0) {
              urls = item.urls.map((url, urlIndex) => {
                return {
                  unbreakable: true,
                  columns: [
                    {
                      text: `${urlIndex + 1}. `,
                      width: 25,
                      margin: [20, 1, 0, 0],
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
                  item.answer
                    ? {
                        image: checkedIcon,
                        width: 15,
                        alignment: 'right',
                        marginRight: 10,
                        marginTop: 12,
                      }
                    : {
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
          })
          .flat(),
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

  let content = <div className={styles.empty}>Checklist not configured.</div>;

  if (checklist && checklist.length > 0) {
    content = (
      <div>
        <Typography variant="h5" align="center" marginTop="10px">
          Reproducibility Checklist
        </Typography>
        <br />
        {checklist.map((item) => (
          <ChecklistItem
            key={item.id}
            item={item}
            project={project}
            onUpdatedNote={onUpdatedNote}
            onDeletedNote={onDeletedNote}
            onAddedNote={onAddedNote}
            onItemUpdate={handleItemUpdate}
            onSelectedAsset={onSelectedAsset}
          />
        ))}
        <br />
        <div className={styles.downloadContainer}>
          <button onClick={() => setOpenExportDialog(true)} className={styles.downloadButton}>
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
            {/* selective export of notes */}
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
  } else if (error) {
    content = <Error>There was an error loading the project checklist: {error}</Error>;
  }

  return <div>{content}</div>;
}

ReproChecklist.propTypes = {
  project: PropTypes.object.isRequired,
  checklist: PropTypes.arrayOf(PropTypes.object),
  error: PropTypes.string,
  onUpdated: PropTypes.func.isRequired,
  onAddedNote: PropTypes.func.isRequired,
  onUpdatedNote: PropTypes.func.isRequired,
  onDeletedNote: PropTypes.func.isRequired,
  onSelectedAsset: PropTypes.func.isRequired,
};

ReproChecklist.defaultProps = {
  project: null,
  checklist: null,
  error: null,
  onUpdated: null,
  onAddedNote: null,
  onUpdatedNote: null,
  onDeletedNote: null,
  onSelectedAsset: null,
};

export default ReproChecklist;
