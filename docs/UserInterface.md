# User Interface Elements

Here's a collection of the user interface elements (React components) we use within this project. Of course, `package.json` is going to have the full list.

- [react-simplemde-editor](https://github.com/RIP21/react-simplemde-editor) - MIT license - this provides a helpful WYSIWG interface for editing markdown text. We use this for the `README` entry in the project About tab.
- [react-markdown](https://github.com/remarkjs/react-markdown) - MIT license - allows viewing rendered markdown. Used for About view.
- [remark-gfm](https://github.com/remarkjs/remark-gfm) - Plugin for GitHub flavored markdown
- [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) - MIT license - styles our About page markdown
- [react-inline-editing](https://github.com/bfischer/react-inline-editing) - MIT license - a label that you can click and immediately edit. Used for the project title.
  > **NOTE** We have a local copy of this code file in `components/EditableLabel/EditableLabel.js` because of issues with the available packaged version.
- [react-tagsinput](https://github.com/olahol/react-tagsinput) - MIT license - managing custom tags to assign to a project.
- [react-data-table-component](https://github.com/jbetancur/react-data-table-component) - Apache 2 license - newsfeed list
