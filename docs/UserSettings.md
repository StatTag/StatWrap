# User Settings

## Person Directory

As a user adds a person to a project, it's very likely they would want/need that information for the person to be used on another project (we can reasonably expect they will collaborate with the same people on multiple projects). To accommodate this, we will store a directory of people as part of the user settings.

The `directory` element within the user settings will be an array containing 0 or more person entries of the following format:

| Item          | Type     | Description                                                                                                                                    |
| ------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`          | `string` | A system-generated UUID that allows us to distinguish between different people entries. Does not guarantee a person is different from another. |
| `name`        | `object` | The person's name - this is an `object` type to allow capturing granular name components.                                                      |
| `affiliation` | `string` | The primary affiliation for the person.                                                                                                        |
| `email`       | `string` | The primary e-mail address for the person                                                                                                      |
| `notes`       | `array`  | [Notes](Notes.md) associated with the person.                                                                                                  |
