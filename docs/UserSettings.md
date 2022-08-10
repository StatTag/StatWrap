# User Settings

The user settings will be stored in `.statwrap/.user-settings.json`.

The following elements will be in the user settings file, with more detail in sub-sections below.

| Item        | Type     | Description                                                                              |
| ----------- | -------- | ---------------------------------------------------------------------------------------- |
| `user`      | `object` | Details about the user running StatWrap. See [User Information](#user-information)       |
| `directory` | `object` | List of people the user has added to projects. See [Person Directory](#person-directory) |

## Person Directory

As a user adds a person to a project, it's very likely they would want/need that information for the person to be used on another project (we can reasonably expect they will collaborate with the same people on multiple projects). To accommodate this, we will store a directory of people as part of the user settings. This is conceptually more like a 'most recently used' list, and we will fix an artifical limit of 20 people in the list.

The `directory` element within the user settings will be an array containing 0..10 `person` entries of the following format:

| Item          | Type     | Description                                                                                                                                                                    |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`          | `string` | A system-generated UUID that allows us to distinguish between different people entries. Does not guarantee a person is different from another.                                 |
| `name`        | `object` | The person's name - this is an `object` type to allow capturing granular name components.                                                                                      |
| `affiliation` | `string` | The primary affiliation for the person.                                                                                                                                        |
| `notes`       | `array`  | [Notes](Notes.md) associated with the person.                                                                                                                                  |
| `added`       | `string` | An ISO-8601 formatted date and time string of when the person entry was added to the directory. This will be updated to the current date and time any time the person is used. |

## User Information

The user information will be an `object` that follows the same `person` structure as defined in the "Person Directory" section. There will only be one entry allowed, and one difference is that `id` will be the user's login name instead of a UUID. We don't anticipate using the `notes` and `added` attributes, but it is not an issue if they are included.

This information will be stored in the `user` element in the user settings.
