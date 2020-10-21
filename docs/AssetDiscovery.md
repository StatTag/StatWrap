# Discovering Assets

Asset discovery is going to be more than just files and folders, but that is where we're going to start initially.  
For our initial work, we will start at the root of the project's file folder and recursively scan every file and folder. We want to make sure we're not being overly intrusive on anything the user has in their folders.

## AssetService

The service in charge of asset discovery can be found in `app/services/assets/assets.js` (`AssetService`). It will have registered within it all of the specialized classes that is able to process each type of asset (called 'handlers'). Each one of these handlers can live in type-specific subdirectories under `app/services/assets/handlers`.

The main entrypoint for `AssetService` is via `scan()`, which takes the root project folder as its only parameter. This kicks off a series of subsequent processing steps to get more information about each of the assets.

The `AssetService` is responsible for first navigating the list of **all** assets in a given project. As noted above, this will start with just files and folders, but can extend to other types of assets (e.g., URLs, databases) in the future. From a design standpoint, it seems to make sense to have this class be the one responsible for identifying all assets. A potential downside we will need to watch out for is if there's a lot of duplicate code in this class and in other asset handler classes.

The list of assets that's built internally will be of this general structure:

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
