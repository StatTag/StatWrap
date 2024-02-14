# StatWrap

![CI Status](https://github.com/StatTag/StatWrap/workflows/Continuous%20Integration/badge.svg)

This project was quickly brought up to speed thanks to the [electron-react-boilerplate](https://github.com/electron-react-boilerplate/electron-react-boilerplate) project.

## Development Environment

StatWrap is built using Electron, which allows cross-platform compiling and deployment. Electron [provides instructions on setup](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites) which are not duplicated here, but briefly requires you to have Node.js and NPM available.

You will also need to have Yarn installed for package management. [Yarn provides several installer options](https://www.electronjs.org/docs/latest/tutorial/tutorial-prerequisites) across operating systems.

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

## Build Issues

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

## Packaging and Notarization (macOS)

**NOTE** These steps are only needed for official release builds of StatWrap. Local development and packaging should not require these steps.

To verify the integrity of applications, Apple requires a notarization step of all applications that are being deployed and released. This will require a separate notarization step then during the packaging (via `yarn package`) for macOS releases. To simplify this process, we make use of the [`electron-builder-notarize`](https://github.com/karaggeorge/electron-builder-notarize) package.

This requires you to set up environment variables for the "secrets" needed to confirm your Apple developer ID. More instructions are available from [https://github.com/karaggeorge/electron-builder-notarize?tab=readme-ov-file#using-notarytool](https://github.com/karaggeorge/electron-builder-notarize?tab=readme-ov-file#using-notarytool). Depending on the method you wish to use, set up your environment file to export the appropriate secrets (e.g., `export APPLE_ID=test@test.com`)
