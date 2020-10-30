# StatWrap

![CI Status](https://github.com/StatTag/StatWrap/workflows/Continuous%20Integration/badge.svg)

This project was quickly brought up to speed thanks to the [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) project.

## Development Environment

StatWrap is built using Electron, which allows cross-platform compiling and deployment. Electron [provides instructions on setup](https://www.electronjs.org/docs/tutorial/development-environment) which are not duplicated here, but briefly requires you to have Node.js and NPM available.

You will also need to have Yarn installed for package management. [Yarn provides several installer options](https://www.electronjs.org/docs/tutorial/development-environment) across operating systems.

Once all of the core system dependencies are installed, go to the StatWrap root directory and use yarn to install all of the packages:

```
yarn
```

To run all unit tests:

```
yarn test
```

To run the Electron app in the `dev` environment (which includes hot updates as you make changes):

```
yarn dev
```

When you are ready to build a version of the app for deployment, you can run:

```
yarn package
```
