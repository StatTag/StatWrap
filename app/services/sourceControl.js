/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
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
   * Retrieve the history of commits for a given file
   */
  async getFileHistory(projectPath, filePath) {
    if (!projectPath || projectPath === undefined || !filePath || filePath === undefined) {
      return null;
    }

    const relativeFilePath = path.relative(projectPath, filePath);
    const commits = await git.log({
      fs,
      dir: projectPath,
      filepath: relativeFilePath,
      force: true
    });
    const formattedCommits = [];
    if (commits) {
      for (const commit of commits) {
        const { committer, message } = commit.commit;
        formattedCommits.push({
          message,
          committer: `${committer.name} (${committer.email})`,
          // eslint-disable-next-line prettier/prettier
          timestamp: new Date((committer.timestamp - (committer.timezoneOffset * 60)) * 1000)
        });
      }
    }
    return formattedCommits;
  }
}
