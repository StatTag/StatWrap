jest.mock('electron', () => ({ ipcRenderer: { send: jest.fn(), on: jest.fn() } }));
jest.mock('../../app/components/Projects/Projects', () => () => null);
jest.mock('../../app/components/Project/Project', () => () => null);
jest.mock('../../app/containers/CreateProjectDialog/CreateProjectDialog', () => () => null);
jest.mock('../../app/components/Projects/ProjectListEntryMenu/ProjectListEntryMenu', () => () => null);

const ProjectPage = require('../../app/containers/ProjectPage/ProjectPage').default;
const ChecklistUtil = require('../../app/utils/checklist').default;

describe('ProjectPage checklist responses', () => {
  let page;
  const project = { id: 'selected', path: '/project' };
  beforeEach(() => {
    page = new ProjectPage({});
    page.state = { ...page.state, selectedProject: project, projects: [project] };
    page.setState = jest.fn((update) => { page.state = { ...page.state, ...update }; });
    page.handleChecklistUpdate = jest.fn();
  });

  it('propagates errors for the selected project without initializing defaults', () => {
    const response = { projectId: project.id, error: true, errorMessage: 'Migration failed', checklist: null };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    page.handleLoadProjectChecklistResponse(null, response);
    expect(page.state.selectedProjectChecklist).toBe(response);
    expect(page.handleChecklistUpdate).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('does not replace the selected checklist with another project error', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    page.handleLoadProjectChecklistResponse(null, { projectId: 'other', error: true, errorMessage: 'Error' });
    expect(page.setState).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('initializes missing/empty checklists through the existing update path with v2 items', () => {
    page.handleLoadProjectChecklistResponse(null, { projectId: project.id, checklist: [], error: false });
    const written = page.handleChecklistUpdate.mock.calls[0][1];
    expect(ChecklistUtil.validateChecklist(written)).toBe(written);
    expect(written.every((item) => typeof item.id === 'string' && !('name' in item) && !('uid' in item))).toBe(true);
  });
});
