# User Interface

## Handling Blocking Tasks

Because of how Electron is set up, even though there is a separate "main" and "render" layer, they are not in separate threads. This means that even if we have a long-running operation in the "main" layer, it can block the UI. To address this, we added a separate BrowserWindow entirely to handle background work. While this introduces overhead to the application, it is (to the best of our knowledge) the recommended way to have a dedicated background worker thread.

The application is structured as follows. `main.dev.js` contains all application initialization code, as well as the majority of client-related tasks that are invoked via IPC calls (e.g., loading projects, saving). As the application is loading, it creates two `BrowserWindow`s - the primary one used for the majority of interactions and the UI, and a dedicated worker window. The worker window will preload `preload.js`, which contains all of the actual background activities. For example, it defines the listener function for scanning assets and does all of the work. This is preloaded and used by the worker window when `worker.html` is loaded. `worker.html` uses a very minimal `worker.js` to activate the listeners.

If you want to add a new long-running task:

1. Define the IPC listener function in `preload.js`. This is where the actual logic/work should exist, including calls to services, etc. as needed.
2. Activate the listener in `worker.js`. In the handler for `DOMContentLoaded`, call your listener function to activate it.

Users will never see the background worker `BrowserWindow`. It is set up to be entirely hidden, even though there is technically a UI component to it. You may want to show the window when developing/debugging, but it should be hidden for production releases of the application.

## User Interface Elements

Here's a collection of the user interface elements (React components) we use within this project. Of course, `package.json` is going to have the full list.

- [react-simplemde-editor](https://github.com/RIP21/react-simplemde-editor) - MIT license - this provides a helpful WYSIWG interface for editing markdown text. We use this for the `README` entry in the project About tab.
- [react-markdown](https://github.com/remarkjs/react-markdown) - MIT license - allows viewing rendered markdown. Used for About view.
- [remark-gfm](https://github.com/remarkjs/remark-gfm) - Plugin for GitHub flavored markdown
- [github-markdown-css](https://github.com/sindresorhus/github-markdown-css) - MIT license - styles our About page markdown
- [react-inline-editing](https://github.com/bfischer/react-inline-editing) - MIT license - a label that you can click and immediately edit. Used for the project title.
  > **NOTE** We have a local copy of this code file in `components/EditableLabel/EditableLabel.js` because of issues with the available packaged version.
- [react-tagsinput](https://github.com/olahol/react-tagsinput) - MIT license - managing custom tags to assign to a project.
- [react-data-table-component](https://github.com/jbetancur/react-data-table-component) - Apache 2 license - newsfeed list
- [react-d3-graph](https://github.com/danielcaldas/react-d3-graph) - MIT License - render dependency graphs. Note that you will have to explicitly install d3 (`yarn add d3`) if you get errors during installation for this library.
