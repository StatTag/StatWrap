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

There are some potential build issues that we need to fix long-term, but have temporary workarounds. If after running `yarn install` you get an error:

```
ERROR in ./node_modules/node-gyp/lib/Find-VisualStudio.cs 9:6
Module parse failed: Unexpected token (9:6)
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file. See https://webpack.js.org/concepts#loaders
| // This script needs to be compatible with PowerShell v2 to run on Windows 2008R2 and Windows 7.
|
> using System;
| using System.Text;
| using System.Runtime.InteropServices;
 @ ./node_modules/node-gyp/lib/ sync ^\.\/.*$ ./Find-VisualStudio.cs
 @ ./node_modules/node-gyp/lib/node-gyp.js 41:13-36 195:36-53
 @ ./node_modules/@electron/rebuild/lib/src/module-type/node-gyp.js 9:35-54
 @ ./node_modules/@electron/rebuild/lib/src/module-rebuilder.js 34:19-52
 @ ./node_modules/@electron/rebuild/lib/src/rebuild.js 38:27-56
 @ ./node_modules/@electron/rebuild/lib/src/main.js 4:18-38
 @ dll renderer renderer[0]
```

You will need to manually remove the file `./node_modules/node-gyp/lib/Find-VisualStudio.cs`, then re-run `yarn install`. We'll work on finding a long-term fix for this.

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
