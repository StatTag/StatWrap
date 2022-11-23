/* eslint-disable lines-between-class-members */
import chokidar from 'chokidar';
import Messages from '../constants/messages';

export default class LogWatcherService {
  watcher = null;
  // For each watch project, we want the key to be
  // the project log file path that is being watched,
  // and the value is the project ID.  That will allow
  // us to broadcast the project ID of a project whose
  // log file changes.
  watchedProjects = {};

  constructor(win) {
    this.win = win;
  }

  /**
   * Stop watching all project logs and clear the list
   * of projects we were previously watching.
   */
  stop() {
    if (this.watcher !== null) {
      this.watcher
        .close()
        .then(() => {
          this.watcher = null;
          return null;
        })
        .catch(() => {
          this.watcher = null;
          return null;
        });
      this.watchedProjects = {};
    }
  }

  /**
   * Add a new project to the list of watched log files and begin watching for log file changes
   * @param {uri} path The path of the project log file to watch
   * @param {*} projectId The ID of the project associated with the watched log file
   */
  add(path, projectId) {
    // If the project is already registered with our watcher,
    // we will exit early.
    if (this.watchedProjects[path] !== undefined) {
      return;
    }

    this.watchedProjects[path] = projectId;

    if (this.watcher === null) {
      this.watcher = chokidar.watch(path, {
        persistent: true,
        usePolling: true, // Documentation notes we need this for detecting changes over network
        awaitWriteFinish: true // Ensure log file (which can grow large) is done being written to
      });
      this.watcher.on('change', changedPath => {
        if (this.win) {
          this.win.webContents.send(Messages.PROJECT_EXTERNALLY_CHANGED_RESPONSE, {
            projectId: this.watchedProjects[changedPath]
          });
        }
      });
    } else {
      this.watcher.add(path);
    }
  }

  /**
   * Stop watching a specific project log file, given its path
   * @param {uri} path The path of the project log file to stop watching
   */
  remove(path) {
    if (this.watcher === null || this.watchedProjects[path] === undefined) {
      return;
    }

    this.watcher.unwatch(path);
    delete this.watchedProjects[path];
  }

  /**
   * Stop watching a specific project log file, given the project ID
   * @param {string} id The UUID from StatWrap associated with the project
   */
  removeById(id) {
    if (this.watcher === null || this.watchedProjects === null) {
      return;
    }

    // Solution from: https://stackoverflow.com/a/28191966
    const projectPath = Object.keys(this.watchedProjects).find(
      key => this.watchedProjects[key] === id
    );
    if (!projectPath) {
      return;
    }
    this.remove(projectPath);
  }
}
