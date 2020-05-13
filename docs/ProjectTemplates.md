# Project Templates

StatWrap allows you to create templates for projects, which automate building a specific folder structure. When you create a new project (this is not available for an existing project/directory), the template defines the folder hierarchy that you would like created.

## Template Definition

There are a set of pre-defined templates that come packaged with StatWrap. These are defined within the source code in `app/constants/project-types.json`. Each template entry uses the following JSON structure.

```
{
  "id": "Unique identifier (name, UUID, etc.)",
  "name": "User-friendly display name",
  "description": "(Optional) Description of the template",
  "directories": [
    ... (Optional) Nested list of directories to create under the root project folder
  ]
}
```

For example, the `Empty project` template is defined as follows:

```
{
  "id": "STATWRAP-EMPTY",
  "name": "Empty project",
  "description": "An empty project folder"
}
```

### TODO

- Allow user-defined templates to be specified, saved, and loaded.
- Point templates to GitHub or other locations that contain folders and template files.
