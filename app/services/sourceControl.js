import git from 'isomorphic-git';
import fs from 'fs';
import path from 'path';

export default class SourceControlService {
  /**
   * Determine if source control is enabled for a given project.
   *
   * @param {string} projectPath The path to the project root. We will look for source control under here.
   */
  async hasSourceControlEnabled(projectPath) {
    if (!projectPath || projectPath === undefined) {
      return false;
    }

    try {
      fs.accessSync(projectPath);
    } catch {
      return false;
    }

    const branches = await git.listBranches({ fs, dir: projectPath });
    return branches && branches.length > 0;
  }

  /**
   * Convert a timestamp in a specific timezone offset to a JavaScript Date object
   * in UTC time.
   * @param {object} committer An object containing a timestamp and a timezoneOffset attribute
   * @returns A Date object in UTC time
   */
  convertTimestamp(committer) {
    if (!committer || committer === undefined) {
      return null;
    }

    return new Date((committer.timestamp - (committer.timezoneOffset * 60)) * 1000);
  }

  async _getHistory(projectPath, filePath) {
    if (!projectPath || projectPath === undefined) {
      return null;
    }

    const config = {
      fs,
      dir: projectPath,
      force: true,
    };

    if (filePath) {
      config.filepath = path.relative(projectPath, filePath);
    }
    const commits = await git.log(config);
    const formattedCommits = [];
    if (commits) {
      for (const commit of commits) {
        const { committer, message } = commit.commit;
        formattedCommits.push({
          message,
          committer: `${committer.name} (${committer.email})`,
          timestamp: this.convertTimestamp(committer),
        });
      }
    }
    return formattedCommits;
  }

  /**
   * Retrieve the entire commit history for a give project's git repository.
   * @param {string} projectPath The path to the project that has the .git directory
   * @returns Array of formatted commit entries
   */
  async getHistory(projectPath) {
    return this._getHistory(projectPath, null);
  }

  /**
   * Retrieve the history of commits for a given file.  This is to be used
   * for a specific file, and so it will return null if no filePath is provided.
   */
  async getFileHistory(projectPath, filePath) {
    if (!filePath || filePath === undefined) {
      return null;
    }

    return this._getHistory(projectPath, filePath);
  }

  async getTrackedFiles(projectPath) {
    if (!projectPath) {
      return [];
    }

    try {
      const files = await git.listFiles({
        fs,
        dir: projectPath
      });

      return files;
    } catch (error) {
      return [];
    }
  }

  /**
   * Asynchronously inspect a project directory for version control details.
   * Supports both standard .git directories and .git files (submodules/worktrees).
   * @param {string} projectPath The path to the project root
   * @returns {Promise<string[]>} Array of status strings (e.g., ['Git repository detected (.git)', 'Active branch: main'])
   */
  async getVersionControlDetails(projectPath) {
    if (!projectPath || projectPath === undefined) {
      return [];
    }

    try {
      fs.accessSync(projectPath);
    } catch {
      return [];
    }

    const results = [];
    const gitPath = path.join(projectPath, '.git');
    try {
      if (fs.existsSync(gitPath)) {
        const stats = fs.statSync(gitPath);
        if (stats.isDirectory()) {
          results.push('Git repository detected (.git)');
          let branch = null;
          try {
            branch = await git.currentBranch({ fs, dir: projectPath });
          } catch {
            // Fallback: read HEAD if git.currentBranch throws
          }
          if (!branch) {
            const headPath = path.join(gitPath, 'HEAD');
            if (fs.existsSync(headPath)) {
              const headContent = fs.readFileSync(headPath, 'utf8').trim();
              if (headContent.startsWith('ref: refs/heads/')) {
                branch = headContent.replace('ref: refs/heads/', '').trim();
              }
            }
          }
          if (branch) {
            results.push(`Active branch: ${branch}`);
          }
        } else if (stats.isFile()) {
          results.push('Git repository detected (.git file)');
        }
      }
    } catch {
      return [];
    }

    return results;
  }
}
