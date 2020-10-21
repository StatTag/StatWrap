# Project Templates

StatWrap allows you to create templates for projects, which automate building a specific folder structure. When you create a new project (this is not available for an existing project/directory), the template defines the folder hierarchy that you would like created, and can optionally include some files (e.g., a README).

## Template Definition

There are a set of pre-defined templates that come packaged with StatWrap. These are defined within the source code in `app/constants/project-types.json`. Each template entry uses the following JSON structure.

```
{
  "id": "Unique identifier for the template (name, UUID, etc.)",
  "version": "Specific version of the template identified by ID",
  "name": "User-friendly display name",
  "description": "(Optional) Description of the template"
}
```

For example, the `Empty project` template is defined as follows:

```
{
  "id": "STATWRAP-EMPTY",
  "version": "1",
  "name": "Empty project",
  "description": "An empty project folder"
}
```

This is just the registry of available templates, however. The actual template content is found under `app/templates` in a directory tied to the `id` and `version`. This is to make the process of creating and applying templates more straightforward (e.g., `STATWRAP-EMPTY/1` for version 1 of the `STATWRAP-EMPTY` template).

Note that a template is then uniquely identified by `id` + `version`, and this is intended to represent the ID along with the **active** version of the template. The reason we are associating a version with the template in addition to a unique ID is to allow future detection if a template has been updated and there is some future action we may want to trigger in that event. For example, we could allow the user to import missing items, if they wished. The other versions of the template could still be around for reference. At this time no specific features are planned, but we want this level of data to be available.

### TODO

- Allow user-defined templates to be specified, saved, and loaded.
- Point templates to GitHub or other locations that contain folders and template files.
