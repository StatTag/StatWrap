## Checklist Object

### About

The **Checklist Object** represents a single checklist item within the reproducibility checklist. It encompasses various attributes and sub-objects to capture different aspects such as statement, type, answer, user notes, attached images, attached URLs, and sub-checklists.

### Attributes

| Attribute          | Type       | Description                                                                                                                                               |
| ------------------ | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`               | UUID       | A generated unique identifier for the checklist item.                                                                                                     |
| `statement`        | String     | The statement or question associated with the checklist item.                                                                                             |
| `type`             | String     | Indicates the type of checklist item, such as boolean or descriptive.                                                                                     |
| `answer`           | String     | Stores the user's response to the checklist item. ('yes'/'no' for boolean type, 'answer description' for descriptive type)                                                                                                         |
| `userNotes`        | Array ([]Note)| An array containing user-added notes associated with the checklist item.                                                                               |
| `attachedImages`   | Array ([]Image)| An array containing image data of images attached to the checklist item.                                                                              |
| `attachedURLs`     | Array ([]URL)| An array containing URLs attached to the checklist item.                                                                                                |
| `subChecklists`    | Array ([]Sub_checklist)| An array containing sub-checklists associated with the checklist item.                                                                        |
| `updated`          | String     | The timestamp indicating when the checklist item was last updated.                                                                                        |

### Sub-Checklist Object

#### About

The **Sub-Checklist Object** represents a sub-item within a checklist item. It shares similar attributes with the Checklist Object, except for attachments, but is nested within the parent checklist item.

#### Attributes

| Attribute       | Type     | Description                                                                                                                                                |
| --------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | UUID     | A generated unique identifier for the sub-checklist item.                                                                                                  |
| `statement`     | String   | The statement or question associated with the sub-checklist item.                                                                                          |
| `type`          | String   | Indicates the type of sub-checklist item, such as boolean or descriptive.                                                                                  |
| `answer`        | String   | Stores the user's response to the sub-checklist item. ('yes'/'no' for boolean type, 'answer description' for descriptive type)                                                                                         |
| `updated`       | String   | The timestamp indicating when the sub-checklist item was last updated.                                                                                     |

### Note Object

#### About

The **Note Object** stores user-added note associated with checklist items.
This follows the same structure as the existing [notes data type](https://github.com/StatTag/StatWrap/blob/master/docs/Notes.md)

#### Attributes

| Attribute       | Type     | Description                                                                                                                                               |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | UUID     | A generated unique identifier for the note.                                                                                                               |
| `author`        | String   | A display name taken from StatWrap to indicate who created the note.                                                                                      |
| `updated`       | String   | The timestamp indicating when the note was last updated.                                                                                                  |
| `content`       | String   | The text content of the note.                                                                                                                             |

### Image Object

#### About

The **Image Object** stores image data of the image attached to checklist items.

#### Attributes

| Attribute       | Type     | Description                                                                                                                                               |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | UUID     | A generated unique identifier for the image.                                                                                                              |
| `title`         | String   | The title of the image.                                                                                                                                   |
| `description`   | String   | A brief description of the image.                                                                                                                         |
| `updated`       | String   | The timestamp indicating when the image was last updated.                                                                                                 |

### URL Object

#### About

The **URL Object** stores hyperlink of the URL attached to checklist items.

#### Attributes

| Attribute       | Type     | Description                                                                                                                                               |
| --------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`            | UUID     | A generated unique identifier for the URL.                                                                                                                |
| `hyperlink`     | String   | The hyperlink associated with the URL.                                                                                                                    |
| `title`         | String   | The title of the URL.                                                                                                                                     |
| `description`   | String   | A brief description of the URL.                                                                                                                           |
| `updated`       | String   | The timestamp indicating when the URL was last updated.                                                                                                   |

This documentation outlines the structure and attributes of various objects involved in the reproducibility checklist project.
