# Discovering Assets

Asset discovery is going to be more than just files and folders, but that is where we're going to start initially.  
For our initial work, we will start at the root of the project's file folder and recursively scan every file and folder. We want to make sure we're not being overly intrusive on anything the user has in their folders.

## Asset Management

The service in charge of asset discovery can be found in `app/services/assets/assets.js`. It will have registered within it all of the specialized asset processors. Each one of these can live in type-specific subdirectories under `app/services/assets/handlers`

We shouldn't assume that only one handler applies to any one given file. This will allow us to be a little more flexible in how we define and implement the asset handlers, while realizing that we will need to avoid signficant extra processing overhead.

Every handler should implement the following interface:

| Function | Parameters     | Return | Description                                                                                                                                  |
| -------- | -------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `scan`   | `uri` (string) | ??     | Performs the main work of the asset handler in identifying relevant metadata and other information for a specific asset identified by `uri`. |
| `id`     | (None)         | string | Returns a descriptive identifier for the handler, used to track which handler produced specific results.                                     |
