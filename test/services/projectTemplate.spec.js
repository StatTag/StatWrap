import ProjectTemplateService from '../../app/services/projectTemplate';

describe('services', () => {
  describe('projectTemplate', () => {
    afterEach(() => {
      jest.restoreAllMocks();
      jest.clearAllMocks();
    });

    describe('loadProjectTemplates', () => {
      it('should return the list of default project templates', () => {
        const projectTemplates = new ProjectTemplateService().loadProjectTemplates();
        expect(projectTemplates.length).toBe(3);
      });
    });
  });
});
