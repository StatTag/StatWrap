# Searching

To implement searching, we use the (`FlexSearch`)[https://github.com/nextapps-de/flexsearch].
Some considerations for indexing:

1. Stale results - We are not "always on", so we don't know when documents are renamed, added, or deleted. Indexing needs to account for this to ensure we don't have stale results. We should add in assurances that if we perform a search and find a file, that we only return it as a valid result if we confirm the file exists.
2. Speed - indexing should not be a major resource hog on the system. We need to ensure that the library selected for indexing works efficiently. We also need to make sure we are not constantly re-indexing, but while StatWrap is running it should maintain an efficient way of indexing in response to changes.
3. Multiple document modalities - we want to support binary-ish objects, like Word documents. This will require special handling so that we can extract the relevant indexable text from the document and make it available to our indexer.
4. Multiple concurrent users/storing index - if we decide to store the index within the project, it could run into conflicts with multiple users. This may be enough of a consideration to warrant having indexes be a user-specific thing.
5. Facets for searching - as we are indexing, we need to collect more than just text indexes. Some of this we are collecting, but it will be important for users to ultimately be able to search/filter by various facets, such as by file type.
