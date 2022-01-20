# Source Control Integration

We really only have planned to develop support for `git`, but to be as forward thinking as we can we are going to make every attempt to abstract away some of the specific details within StatWrap. The code to manage integration with source control systems is implemented in `services/sourceControl.js`.

## Assumptions

Some assumptions that we are going to start with for StatWrap:

1. A project has only one source control repository
2. The repository is located in the root of the project folder

We do **not** assume that every project will have source control, so features based on that will only be accessible when source control is detected.
