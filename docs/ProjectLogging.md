# Project Logging

StatWrap will keep a running log of actions performed within your project. This will primarily include human-friendly strings that describe the action or event. Unlike most logging frameworks, which are done at the application level, the StatWrap logs are intended to be at the level of each individual project. This means the logger will need to be recreated to ensure it is targeting the right project directory.

## Logging Internals

Logging is currently handled using the [`winston`](https://github.com/winstonjs/winston) package. Because the Electron bootstrap app came with [`electron-log`](https://github.com/megahertz/electron-log), we are looking if we can migrate to that to just have on logger. A benefit of `winston` was its clear instructions on how to set the path where the log file is written. This is necessary for us (as opposed to the default application logging directory) because logs should be at the project leve.

> An important note is that our first implementation does not handle multiple writes very well. This needs to be improved for robustness, especially if we think about multiple users accessing the same project concurrently.

## Logging via Electron

Across the entire application, we will centralize logging via an IPC call using `Messages.WRITE_PROJECT_LOG_REQUEST`. This message will take the following parameters:

| parameter     | type    | description                                                                             |
| ------------- | ------- | --------------------------------------------------------------------------------------- |
| `projectPath` | string  | The fully qualified base path of the project this logged action is for.                 |
| `type`        | string  | The action type                                                                         |
| `description` | string  | The formatted action message to log                                                     |
| `details`     | object? | An optional object that contains the detailed information regarding the specific action |
| `level`       | string? | If provided, the logging level to use. If not specified, this will default to `info`    |
| `user`        | string? | If provided, the name of the user under which the action was generated.                 |

## Generating Actions

Within the React portion of StatWrap, project updates are managed by sending a completely updated `project` object that can be writting to the configuration JSON file. Because this doesn't provide information about what was actually done, that needs to be supplemented with a user-friendly description of the action.

All React actions related to a project will ultimately be routed up through `ProjectPage.js`'s `handleProjectUpdate`. This takes two parameters:

| parameter     | type    | description                                                                              |
| ------------- | ------- | ---------------------------------------------------------------------------------------- |
| `project`     | object  | The updated project information that can be written.                                     |
| `type`        | string? | An optional type of action.                                                              |
| `description` | string? | An optional formatted message that describes the action.                                 |
| `details`     | object? | An optional object that contains the detailed information regarding the specific action. |

If the `description` parameter isn't specified or is empty, no action logging will take place. If `type` is null or empty, it will be set to 'StatWrap Event'.
