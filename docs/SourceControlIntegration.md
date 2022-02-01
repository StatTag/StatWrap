# Source Control Integration

We really only have planned to develop support for `git`, but to be as forward thinking as we can we are going to make every attempt to abstract away some of the specific details within StatWrap. The code to manage integration with source control systems is implemented in `services/sourceControl.js`.

## Assumptions

Some assumptions that we are going to start with for StatWrap:

1. A project has only one source control repository
2. The repository is located in the root of the project folder

We do **not** assume that every project will have source control, so features based on that will only be accessible when source control is detected.

## Support

We will look to see if the project root has source control or not. If not, we don't return any information and are done. If it does have source history, when the user clicks on a file in the asset view, we will do a call to get the commit history **for that file**. We will always do this real-time, and we won't cache any of the source control information in a StatWrap file.

Right now, we will show the commit history (message, committer, timestamp) in a panel in the asset details view. We will consider more features in the future.
