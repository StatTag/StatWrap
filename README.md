# StatWrap

[![CI Status](https://github.com/StatTag/StatWrap/actions/workflows/ci.yml/badge.svg)](https://github.com/StatTag/StatWrap/actions/workflows/ci.yml)

## About

[StatWrap](https://sites.northwestern.edu/statwrap/) is designed as a free and open-source assistive, non-invasive discovery and inventory tool to document research projects. It inventories project assets and organizes information without additional input from the user, while also allowing users to add searchable and filterable notes connected to files to help communicate metadata about intent and analysis steps.

At its core, StatWrap helps you identify, track, and reflect on variation in your research project that could impact the ability to reproduce your work. Variation can happen in many places: (1) people on the project can change over time, so processes may not be consistently executed due to transitions in employment; (2) data changes over time, due to accruing additional cases, adding new variables, or correcting mistakes in existing data; (3) software (e.g. used for data preparation and statistical analysis) evolves as it is edited, improved, and optimized; and (4) software can break or produce different results due to changes ‘under the hood’ such as updates to statistical packages, compilers, or interpreters.

## Design

Some of the guiding principles of StatWrap's design and implementation are:

- Operate as a standalone application: StatWrap should not require the user to install or connect to an external server (API, database, etc.) for its operation
- Passively observe project assets, but never modify them
- Guide users toward actions that are considered recommended practices for reproducible research, understanding that there is no single definition of "best practice", and that teams work differently

More details about the technical design and rationale for StatWrap are recorded in the [`docs`](docs/) folder.

## Development Environment

This project was quickly brought up to speed thanks to the [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) project.

StatWrap is built using Electron (currently 18.3.7), which allows cross-platform compiling and deployment, and React (currently 17.0.2) for the user interface.

Electron [provides instructions on setup](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites) which are not duplicated here, but briefly requires you to have Node.js installed. You will also need to have Yarn installed for package management. [Yarn provides several installer options](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites) across operating systems.

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

## Contributing

StatWrap is primarily driven by a small, core team of developers, but we welcome contributions in any form from anyone who is interested. All interactions must follow the community guidelines set out in the [Code of Conduct](CODE_OF_CONDUCT.md).

If you are interested in making a contribution, please review the [list of open issues](https://github.com/StatTag/StatWrap/issues). Some guidance on expressing interest on an issue:

1. Make sure the issue is ready for someone to work on it
   1. Issues tagged as `placeholder` are not fully specified and are not ready for someone to start development. Feel free to comment on your interest (even support for having the feature implemented as an end user), but be aware it may not be ready to be assigned.
   2. Issues that have someone assigned are already being worked on. Check the comments as well, if multiple people express interest before it is assigned, we will give the first opportunity to the person who commented first about their interest.
   3. Issues tagged as `need-feedback` may be waiting on user/stakeholder feedback before development can continue
2. When you find an issue you'd like to work on, post a comment expressing interest. You can feel free to start working on it at that point. One of the maintainers will assign it to you.
3. Feel free to post clarifying questions in the issue to get feedback as you develop

As you are working on an issue, **there is no obligation to see it to completion**. Sometimes the issue is more involved or complex than we originally thought, and there is a lot to learn from having someone investigate the problem. If you find yourself in this position, please post an update in the issue thread, and inform the maintainers of your progress. If you were able to complete some of the work but not all, we may have you proceed with a pull request of what you have done, so you can get credit for your work. If nothing else, we will have a history of your progress and can unassign you, leaving it available for someone else to take on.

For changes to the codebase (including documentation), suggested changes should be submitted as a [Pull Request](https://github.com/StatTag/StatWrap/pulls). A member of the core team will review the PR and follow up with additional questions or suggestions.

We do not use templates for reporting issues - anyone who has a question about how StatWrap works (end users), suggestions for improvement, technical questions, etc. should feel free to [open a new issue](https://github.com/StatTag/StatWrap/issues/new/choose).

We appreciate contributions from the community, but as with any project a change suggested may not be something we choose to incorporate into the code base. If you have any questions about creation or implementation of a feature, please feel free to [open a new issue](https://github.com/StatTag/StatWrap/issues/new/choose) to solicit feedback.

## Solutions to Development Issues

If when running the project locally, you get the following error:

```
node:internal/errors:497
    ErrorCaptureStackTrace(err);
    ^

Error: ENOSPC: System limit for number of file watchers reached, watch '/home/<user>/StatWrap/configs'
    at FSWatcher.<computed> (node:internal/fs/watchers:247:19)
    at Object.watch (node:fs:2392:36)
```

You will need to increase the number of file watchers available, to its maximum, by running the following command:

For debian-based distros:

Execute this command:

```
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf && sudo sysctl -p
```

For arch-based distros:

Add `fs.inotify.max_user_watches=524288` to `/etc/sysctl.d/99-sysctl.conf` and then execute `sysctl --system`
Or
Follow [these instructions](https://gist.github.com/tbjgolden/c53ca37f3bc2fab8c930183310918c8c) instead.

## Solutions to Build Issues

There are some potential build/packaging issues that we need to fix long-term, but have temporary workarounds.

If when building/packaging you get the following error:

```
[1] <--- JS stacktrace --->
[1]
[1] FATAL ERROR: MarkCompactCollector: young object promotion failed Allocation failed - JavaScript heap out of memory
[1]  1: 00007FF7C4121DDF napi_wrap+109135
 2: 00007FF7C40C6D06 v8::internal::OrderedHashTable<v8::internal::OrderedHashSet,1>::NumberOfElementsOffset+33350
[1]  3: 00007FF7C40C7AD6 node::OnFatalError+294
[1]  4: 00007FF7C49964CE v8::Isolate::ReportExternalAllocationLimitReached+94
[1]  5: 00007FF7C497B31D v8::SharedArrayBuffer::Externalize+781
[1]  6: 00007FF7C482574C v8::internal::Heap::EphemeronKeyWriteBarrierFromCode+1516
[1]  7: 00007FF7C48102EB v8::internal::NativeContextInferrer::Infer+59339
[1]  8: 00007FF7C47F571F v8::internal::MarkingWorklists::SwitchToContextSlow+57503
[1]  9: 00007FF7C480947B v8::internal::NativeContextInferrer::Infer+31067
10: 00007FF7C480050D v8::internal::MarkCompactCollector::EnsureSweepingCompleted+6269
[1] 11: 00007FF7C48086CE v8::internal::NativeContextInferrer::Infer+27566
[1] 12: 00007FF7C480C64B v8::internal::NativeContextInferrer::Infer+43819
[1] 13: 00007FF7C4815E82 v8::internal::ItemParallelJob::Task::RunInternal+18
[1] 14: 00007FF7C4815E03 v8::internal::ItemParallelJob::Run+643
[1] 15: 00007FF7C47E9583 v8::internal::MarkingWorklists::SwitchToContextSlow+7939
```

You will need to increase the memory size allocated to Node, using this command:

```
export NODE_OPTIONS=--max-old-space-size=8192
```

If when building/packaging you get an error (this first appeared on Apple M2 device, but may not be specific to arm64 architecture):

```
• building block map  blockMapFile=release/StatWrap-0.0.13-arm64-mac.zip.blockmap
  ⨯ Exit code: ENOENT. spawn /usr/bin/python ENOENT  failedTask=build stackTrace=Error: Exit code: ENOENT. spawn /usr/bin/python ENOENT
    at /Users/Development/StatWrap/node_modules/builder-util/src/util.ts:133:18
    at exithandler (node:child_process:427:5)
    at ChildProcess.errorhandler (node:child_process:439:5)
    at ChildProcess.emit (node:events:511:28)
    at Process.ChildProcess._handle.onexit (node:internal/child_process:291:12)
    at onErrorNT (node:internal/child_process:483:16)
    at processTicksAndRejections (node:internal/process/task_queues:82:21)
error Command failed with exit code 1.
```

You will need to ensure Python 2.7 is available. This is required (for now) by the packages used for building and packaging.

```
pyenv install 2.7.18
export PYTHON_PATH=$HOME/.pyenv/versions/2.7.18/bin/python
yarn package
```

_(Solution courtesy of: https://github.com/marktext/marktext/issues/3175#issuecomment-1208840633)_

## Solutions to Packaging Issues

On Windows, if when trying to run `yarn package`, you may see the following error from electron-builder:

```
errorOut=ERROR: Cannot create symbolic link : <some path>
```

Looking back at the error, you will notice that it is failing when trying to download and extract a temporary copy of `winCodeSign`:

```
Extracting archive: C:\Users\<username>>\AppData\Local\electron-builder\Cache\winCodeSign\618674575.7z
```

This has to do with how `winCodeSign` is packaged up, where it wants to create symlinks for some lib files. If you search for this error, some recommendations are to run `yarn package` with administrative rights. **This is not adviseable** - you should not have to run the packaging process with elevated rights, and it opens potential security risks. Instead, follow these steps:

> "Download the winCodeSign.7z package manually. You can use the same URL as electron-builder is using:
> https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z

> Then extract the archive to the requested location (I've used 7-Zip 23.01 for Windows) so that you have this folder on your machine:
> C:\Users\<YourUserName>\AppData\Local\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0\"

_(Solution courtesy of: https://github.com/electron-userland/electron-builder/issues/8149#issuecomment-2079252400)_

This should be a one-time change to your system. Once this folder is set up, you should be able to run `yarn package`, and the build process will use the existing copy of `winCodeSign` instead of trying to download a new one.

## Packaging and Notarization (macOS)

**NOTE** These steps are only needed for official release builds of StatWrap. Local development and packaging should not require these steps.

To verify the integrity of applications, Apple requires a notarization step of all applications that are being deployed and released. This will require a separate notarization step then during the packaging (via `yarn package`) for macOS releases. To simplify this process, we make use of the [`electron-builder-notarize`](https://github.com/karaggeorge/electron-builder-notarize) package.

This requires you to set up environment variables for the "secrets" needed to confirm your Apple developer ID. More instructions are available from [https://github.com/karaggeorge/electron-builder-notarize?tab=readme-ov-file#using-notarytool](https://github.com/karaggeorge/electron-builder-notarize?tab=readme-ov-file#using-notarytool). Depending on the method you wish to use, set up your environment file to export the appropriate secrets (e.g., `export APPLE_ID=test@test.com`)
