# Searching

## Indexing and Storage

To implement indexing and searching, we use the [`FlexSearch`](https://github.com/nextapps-de/flexsearch). We index content at the project level. This means that each project will have its own index file. This will allow searching within a project (easily and quickly, without extra filtering), as well as the ability to search across all projects.

Index files will be stored at the user setting level within StatWrap. Each user configures which projects they want to have active in their list, which is also stored at the user setting level within StatWrap. It was felt this would be better than storing the index within the project. If we were to store it at the project level, we would have to contend with source control (if the user has it enabled in the project), as well as multiple StatWrap clients trying to write an index file simultaneously. Although there are ways to deal with both of those concerns, we meet the same objectives and simplify the overall design and implementation by storing this at the user level.

Indexes will be stored under the `.statwrap-index` directory under the path returned by `userData` (see [https://www.electronjs.org/docs/latest/api/app#appgetpathname](https://www.electronjs.org/docs/latest/api/app#appgetpathname)). Each index will be named `<project_id>.json` (with the UUID being the project ID).

### Launching Indexing

When StatWrap starts, and the main processing thread receives the `LOAD_PROJECT_LIST_REQUEST` message, we will initiate a `FlexSearch.Index` for each configured project. The indexer will start up if the root folder of the project is accessible. In addition, we will add a `FlexSearch.Index` if the user creates/adds a project and we receive a `CREATE_PROJECT_REQUEST` message which succeeds.

If we receive a `REMOVE_PROJECT_LIST_ENTRY_REQUEST` message, we will check for the `FlexSearch.Index` associated with that removed project. At that point we will stop the worker, and also remove the index file in the user's settings.

All of the interactions with the FlexSearch library are wrapped by the `SearchService`. This has an interface to manage all interactions with the FlexSearch library directly.

## Assets to Index

We want to be as efficient as possible when implementing our indexing process. In addition, we want to ensure that we are indexing files that are good candidates for indexing, and void indexing potentially sensitive information where we can.

We will index the following to be available for searching:

1. StatWrap notes (project, asset, person)
2. StatWrap objects (project, person)
3. StatWrap Log history
4. Source control commit messages
5. Asset names
6. Asset contents (more details below)

We will index contents of assets that:

1. Are identified by StatWrap as `code` or `documentation`
2. Are not otherwise excluded (see below) and are less than 50KB[1] in size

We will exclude from indexing assets that:

1. Are flagged by StatWrap as `data`
2. Are annotated by the user as being sensitive
3. Are binary files[2]

### Footnotes

[1] 50KB is an arbitrary size threshold that we selected. It may be changed in a future version of StatWrap.

[2] We will actively work to increase the types of files we can index for searching over time. For example, initially Word documents may not be indexed, but could be added in the future.

## Notes

Some considerations for indexing:

1. Stale results - We are not "always on", so we don't know when documents are renamed, added, or deleted. Indexing needs to account for this to ensure we don't have stale results. We should add in assurances that if we perform a search and find a file, that we only return it as a valid result if we confirm the file exists.
2. Speed - indexing should not be a major resource hog on the system. We need to ensure that the library selected for indexing works efficiently. We also need to make sure we are not constantly re-indexing, but while StatWrap is running it should maintain an efficient way of indexing in response to changes.
3. Multiple document modalities - we want to support binary-ish objects, like Word documents. This will require special handling so that we can extract the relevant indexable text from the document and make it available to our indexer.
4. Multiple concurrent users/storing index - if we decide to store the index within the project, it could run into conflicts with multiple users. This may be enough of a consideration to warrant having indexes be a user-specific thing.
5. Facets for searching - as we are indexing, we need to collect more than just text indexes. Some of this we are collecting, but it will be important for users to ultimately be able to search/filter by various facets, such as by file type.

Other considerations (from Eric):

1. Allow for certain file types to be excluded (binary objects we can’t read or file types a user identifies, etc.)
2. Allow for certain file sizes to be excluded (mainly for performance - I would imagine our search catalog would also grow to be huge)
3. Do we want to allow indexing to be retained on deleted objects? Or is the behavior more “we only search accessible objects” vs. “providing a way to retain search across time”?
4. L: _I like this idea, but we do run the risk of a file being created, edited, and deleted all without StatWrap's knowledge_
5. Will this search act as a universal search across data/metadata within the statwrap application? EX: users, notes, etc.
6. Git... if we enable git, is our search catalog going to show up as a part of source control? What is the expected user behavior? Do they want “search” to be able to search across objects across versions?
