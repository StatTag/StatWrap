import AssetUtil from '../../app/utils/note';

describe('utils', () => {
  describe('NoteUtil', () => {
    describe('createNote', () => {
      it('creates the note', () => {
        const note = AssetUtil.createNote('Test 1', 'Test 2');
        expect(note.author).toBe('Test 1');
        expect(note.content).toBe('Test 2');
        expect(note.id).toBeDefined();
        expect(note.updated).toBeDefined();
      });

      it('creates two notes with different IDs', () => {
        const note1 = AssetUtil.createNote('Test 1', 'Test 2');
        const note2 = AssetUtil.createNote('Test 1', 'Test 2');
        expect(note1).not.toEqual(note2);
        expect(note1.id).not.toEqual(note2.id);
      });
    });

    describe('getNoteDate', () => {
      it('creates a formatted date', () => {
        Date.now = jest.fn(() => 1604084623302); // '2020-10-30T19:03:43.302Z'
        expect(AssetUtil.getNoteDate()).toBe('2020-10-30 19:03:43');
      });
    });
  });
});
