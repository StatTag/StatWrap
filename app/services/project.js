/* eslint-disable class-methods-use-this */
const fs = require('fs');
const os = require('os');
const path = require('path');

const DefaultProjectListFile = '.statwrap-projects.json';
const DefaultProjectFile = '.statwrap-project.json';

export { DefaultProjectListFile, DefaultProjectFile };

export default class ProjectService {
  loadListFromFileStub() {
    return [
      {
        id: 'd01d2925-f6ff-4f8e-988f-fca2ee193427',
        name: 'Local project using relative path',
        favorite: true,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        path: '~/Development/StatTag/StatWrapProjects/project1'
      },
      {
        id: '6ff79e02-4f24-4948-ac77-f3f1b67064e5',
        name: 'XuS_775 - Shared drive',
        favorite: false,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        // eslint-disable-next-line prettier/prettier
        path: 'smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/NUCATS/NUCATS_Shared/BERDShared/StatWrap/Test folders/XuS_775'
      },
      {
        id: '6ff79e02-4f24-4948-ac77-f3f1b67064e6',
        name: 'Invalid project',
        favorite: false,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        path: 'smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Project3'
      }
    ];
  }

  loadStub() {
    return {
      id: '6ff79e02-4f24-4948-ac77-f3f1b67064e6',
      name: 'Test 3',
      tags: ['NIH', 'Grant', 'Team Science']
    };
  }

  loadListFromFile(filePath = DefaultProjectListFile) {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath);
    return JSON.parse(data.toString());
  }

  loadFromFile(dir) {
    const filePath = path.join(
      dir.replace('~', os.homedir),
      DefaultProjectFile
    );
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath);
    return JSON.parse(data.toString());
  }
}
