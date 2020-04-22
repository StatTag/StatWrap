/* eslint-disable class-methods-use-this */
const fs = require('fs');
const path = require('path');

const DefaultProjectListFile = '.statwrap-projects.json';
const DefaultProjectFile = '.statwrap-project.json';

export { DefaultProjectListFile, DefaultProjectFile };

export default class ProjectService {
  loadListStub() {
    return [
      {
        id: 'd01d2925-f6ff-4f8e-988f-fca2ee193427',
        name: 'Test 1',
        favorite: true,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        path: '~/Development/projects/test1'
      },
      {
        id: '6ff79e02-4f24-4948-ac77-f3f1b67064e5',
        name: 'Test 2',
        favorite: false,
        lastAccessed: '2020-04-21T21:21:27.041Z',
        path: 'smb://fsmresfiles.fsm.northwestern.edu/fsmresfiles/Projects/Shared/Project2'
      },
      {
        id: '6ff79e02-4f24-4948-ac77-f3f1b67064e6',
        name: 'Test 3',
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
    const filePath = path.join(dir, DefaultProjectFile);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath);
    return JSON.parse(data.toString());
  }
}
