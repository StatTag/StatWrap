## Checklist Object

### About

The **Checklist Object** represents a single checklist item within the reproducibility checklist. It encompasses various attributes and sub-objects to capture different aspects such as statement, type, answer, user notes, attached images, attached URLs, and sub-checklist.

### Attributes

| Attribute      | Type                    | Description                                                             |
| -------------- | ----------------------- | ----------------------------------------------------------------------- |
| `id`           | UUID                    | A generated unique identifier for the checklist item.                   |
| `name`         | String                  | The name of the checklist item.                                         |
| `statement`    | String                  | The statement or question associated with the checklist item.           |
| `answer`       | Bool                    | Stores the user's response to the checklist item.                       |
| `notes`        | Array ([]Note)          | An array containing user notes attached to the checklist item.          |
| `images`       | Array ([]Image)         | An array containing data of image files attached to the checklist item. |
| `urls`         | Array ([]URL)           | An array containing URLs attached to the checklist item.                |
| `subChecklist` | Array ([]Sub_checklist) | An array containing sub-checklist associated with the checklist item.   |

### Sub-Checklist Object

#### About

The **Sub-Checklist Object** represents a sub-item within a checklist item. It shares similar attributes with the Checklist Object, except for attachments, but is nested within the parent checklist item.

#### Attributes

| Attribute   | Type   | Description                                                       |
| ----------- | ------ | ----------------------------------------------------------------- |
| `id`        | UUID   | A generated unique identifier for the sub-checklist item.         |
| `statement` | String | The statement or question associated with the sub-checklist item. |
| `answer`    | Bool   | Stores the user's response to the sub-checklist item.             |

### Note Object

#### About

The **Note Object** stores user-added note associated with checklist items.
This follows the same structure as the existing [notes data type](https://github.com/StatTag/StatWrap/blob/master/docs/Notes.md)

#### Attributes

| Attribute | Type   | Description                                                          |
| --------- | ------ | -------------------------------------------------------------------- |
| `id`      | UUID   | A generated unique identifier for the note.                          |
| `author`  | String | A display name taken from StatWrap to indicate who created the note. |
| `updated` | String | The timestamp indicating when the note was last updated.             |
| `content` | String | The text content of the note.                                        |

### Image Object

#### About

The **Image Object** stores data of the image files attached to checklist items.

#### Attributes

| Attribute     | Type   | Description                                  |
| ------------- | ------ | -------------------------------------------- |
| `id`          | UUID   | A generated unique identifier for the image. |
| `uri`         | String | The URI of the image file.                   |
| `title`       | String | The title of the image.                      |
| `description` | String | A brief description of the image.            |

### URL Object

#### About

The **URL Object** stores hyperlink of the URLs attached to checklist items.

#### Attributes

| Attribute     | Type   | Description                                |
| ------------- | ------ | ------------------------------------------ |
| `id`          | UUID   | A generated unique identifier for the URL. |
| `hyperlink`   | String | The hyperlink associated with the URL.     |
| `title`       | String | The title of the URL.                      |
| `description` | String | A brief description of the URL.            |

This documentation outlines the structure and attributes of various objects involved in the reproducibility checklist project.
