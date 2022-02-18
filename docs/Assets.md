# Assets

## About

Assets is the collective term used for anything that appears in a project. It is vague on purpose, because StatWrap tries to be accommodating of any type of 'thing' that belongs to your project. This more traditionally includes files and folders, but can also be URLs, databases, web services, etc.

The only things assets need to have are a `uri` and a `type`.

The structure of an asset is as follows:

| Item          | Type   | Description                                                                                                                                                                    |
| ------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `uri`         | String | The location of the asset. This must be unique within the project.                                                                                                             |
| `name`        | String | Optional display name. If no name is provided, this will default to the `uri`                                                                                                  |
| `type`        | String | The type of the asset. This is a more basic list that captures how the asset is interacted with, not necessarily what it contains. Examples include directory, file, URL, etc. |
| `contentType` | String | Describe the type of content within the asset. This is more about what the asset does, not where it's stored.                                                                  |
| `attributes`  | Array  | A collection of objects containing additional attributes about the asset. The contents and composition of attributes is driven by the asset type                               |

This structure applies to the asset when it's in memory, and when it is saved in configuration/metadata files. An important consideration is that for assets to be resolvable across multiple users, we cannot store the `uri` as the absolute path, and when it is in memory it is inefficient to have it only be relative (requiring us to make it absolute). To work around this, we will adopt the following convention:

**READING** - whenever a class reads asset information, and it contains file/directory assets, the class is responsible for translating the relative path to an absolute paths.

**WRITING** - whenever a class is writing asset information, and it contains file/directory assets, the class is responsible for translating the absolute path to a relative path.

This will centralize the responsibility of the asset URI translation, and allows all other classes to assume that a URI is truly a fully-qualified path. From a code standpoint, the actual reading/writing should only be done within the `main.dev.js` implementation. Supporting classes used within here should clearly document if they are responsible for modifying paths. If not, the class assumes it will be given absolute paths (if it uses paths for any of its work).

## Asset Attributes

The master list of attributes is loaded from [app/constants/assets-config.js](app/constants/assets-config.js). This returns the entire configuration object for assets, and the `attributes` element of this object has the attribute configuration.

Each attribute entry is configured as follows:

| Item        | Type   | Description                                                                                                      |
| ----------- | ------ | ---------------------------------------------------------------------------------------------------------------- |
| `id`        | String | Unique human-readable identifier for the attribute. This should be unique across all attributes within StatWrap. |
| `display`   | String | The display label to use when rendering the attribute                                                            |
| `details`   | String | Extended descriptive information about how to interpret the attribute                                            |
| `type`      | String | The type of attribute. This can include:<br/>- bool - a boolean/checkbox<br/>- text - a short string             |
| `appliesTo` | Array  | The asset types that use this attribute                                                                          |

## Discovering Assets

Asset discovery is going to be more than just files and folders, but that is where we're going to start initially.  
For our initial work, we will start at the root of the project's file folder and recursively scan every file and folder underneath it. We want to make sure we're not being overly intrusive on anything the user has in their folders, so scanning needs to be a 'light touch'.

### AssetService

The service in charge of asset discovery can be found in `app/services/assets/assets.js` (`AssetService`). It will have registered within it all of the specialized classes that is able to process each type of asset (called 'handlers'). Each one of these handlers can live in type-specific subdirectories under `app/services/assets/handlers`.

The main entrypoint for `AssetService` is via `scan()`, which takes the root project folder as its only parameter. This kicks off a series of subsequent processing steps to get more information about each of the assets.

The `AssetService` is responsible for first navigating the list of **all** assets in a given project. As noted above, this will start with just files and folders, but can extend to other types of assets (e.g., URLs, databases) in the future. From a design standpoint, it seems to make sense to have this class be the one responsible for identifying all assets. A potential downside we will need to watch out for is if there's a lot of duplicate code in this class and in other asset handler classes.

The list of assets that are built internally will be of this general structure:

```
{
  id: 'uuid',  - Assigned by StatWrap when added/indexed within the project
  uri: 'the provided uri to scan',
  type: 'file | directory | socket | symlink | ... others TBD ... | other | unknown',
  metadata: Array,
  children: Array (optional) - only if type is 'directory'
}
```

Because we will only ever send in a directory as the URI to scan, we always return an object instead of an array. Nested assets will be contained within the `children` attribute (if applicable), and can be recursively navigated.

Once this structure of assets is built, it is sent to our collection of handlers for additional annotation.

> NOTE: We don't assume that only one handler applies to any asset. This will allow us to be a little more flexible in how we define and implement the asset handlers, while realizing that we will need to avoid signficant extra processing overhead.

Every handler should implement the following interface:

| Function | Parameters       | Return | Description                                                                                                                                                                                                                                                                                                                                                                                           |
| -------- | ---------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scan`   | `asset` (Object) | Object | Performs the main work of the asset handler in identifying relevant metadata and other information for a root asset specified by `asset`. It is assumed that each handler will recursively process all descendant assets. Each handler will add an object to the `metadata` collection, if it handles the specified asset. This is expected to include an `id` attribute that is the value of `id()`. |
| `id`     | (None)           | string | Returns a descriptive identifier for the handler, used to track which handler produced specific results.                                                                                                                                                                                                                                                                                              |

## Asset Metadata

Multiple elements can be looked at, which can vary by asset type. For example, what we look at for a folder would differ from a Python code file, and those would differ from a web service/API or a database. Understanding then that metadata is going to be both flowing and growing for each type of asset, here are some of the things we are looking for.

### Python Code Files

We collect 3 categories of metadata for Python code files:

**Inputs**

| Category       | Example Functions | Data Type |
| -------------- | ----------------- | --------- |
| Figures/images | `imread`          | `figure`  |
| Pandas         | `read_*`          | `data`    |
| Python I/O     | `open`            | `data`    |

**Outputs**

| Category                             | Example Functions    | Data Type |
| ------------------------------------ | -------------------- | --------- |
| Figures/images - PyPlot, ImageMagick | `savefig`, `imwrite` | `figure`  |
| Pandas                               | `to_*`               | `data`    |
| Python I/O                           | `open`               |

**Libraries**

Packages and modules, including aliases

### R Code Files

We collect 3 categories of metadata for R code files:

**Inputs**

| Category      | Example Functions | Data Type |
| ------------- | ----------------- | --------- |
| R data import | `read.*`          | `data`    |
| readr         | `read_*`          | `data`    |
| R connections | `file`, `bzfile`  | `data`    |
| Source        | `source`          | `code`    |

**Outputs**

| Category      | Example Functions | Data Type |
| ------------- | ----------------- | --------- |
| R plots       | `pdf`, `png`      | `figure`  |
| ggplot        | `ggsave`          | `figure`  |
| R data export | `write.*`         | `data`    |
| readr         | `write_*`         | `data`    |
| R connections | `file`, `bzfile`  | `data`    |

**Libraries**

Regular library includes

### SAS Code Files

We collect 3 categories of metadata for SAS code files:

**Inputs**

| Category   | Example Functions | Data Type |
| ---------- | ----------------- | --------- |
| SAS PROC   | `PROC IMPORT`     | `data`    |
| SAS infile | `infile`          | `data`    |

**Outputs**

| Category    | Example Functions     | Data Type |
| ----------- | --------------------- | --------- |
| ODS figures | `ODS PDF`, `ODS PS`   | `figure`  |
| ODS data    | `ODS CSV`, `ODS HTML` | `data`    |
| SAS PROC    | `PROC EXPORT`         | `data`    |

**Libraries**

References to macros and libraries via path or via `fileref`.

### Stata Code Files

We collect 3 categories of metadata for Stata code files:

**Inputs**

| Category      | Example Functions        | Data Type |
| ------------- | ------------------------ | --------- |
| Stata imports | `import excel`, `infile` | `data`    |

**Outputs**

| Category        | Example Functions         | Data Type |
| --------------- | ------------------------- | --------- |
| Stata graph     | `graph export`            | `figure`  |
| Stata logs      | `log using`               | `log`     |
| Stata export    | `export excel`, `outfile` | `data`    |
| Document export | `putdocx`, `putpdf`       | `data`    |
| estout package  | `estout using`            | `data`    |
| table1 package  | `table1 saving`           | `data`    |

**Libraries**

External programs and plugins, and references to Do files to run via another script.
