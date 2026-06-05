# StatWrap Changelog

## 0.0.21 - June 5, 2026

### Change Summary

This release includes a **large** list of changes, with many thanks to several new contributors!

- Update dependencies
- Implement live search with debounce (@aabhinavvvvvvv)
- Clear project selection after removing a project by (@aabhinavvvvvvv)
- Add "Show in File Explorer" context menu option to project list (@dibyanshu-pal-kushwaha)
- Guard against losing project description changes (@dibyanshu-pal-kushwaha)
- Auto-select default project on app load (@aabhinavvvvvvv)
- Fix retaining selected project after navigation by (@dibyanshu-pal-kushwaha)
- Add feature to select sub-folder of project for dependency view (@dibyanshu-pal-kushwaha)
- Fix three dots menu option making clickable (@dibyanshu-pal-kushwaha)
- Preserve the asset expansion state when in the same project view (@dibyanshu-pal-kushwaha)
- Fixed archive inherits at folders (@dibyanshu-pal-kushwaha)
- Fix inconsistent naming for project pinning (@adityai0)
- Add additional folders/file from External Resource (@dibyanshu-pal-kushwaha)
- Warn when sensitive files are tracked by version control (@Ayush4958)
- Added saving roles by clicking save button (@dibyanshu-pal-kushwaha)
- Fixed Notes content overflow (@dibyanshu-pal-kushwaha)
- Add "uncheck all" option in workflow filters (@adityai0)
- fixes the note component (@Ayush4958)
- fix: dashboard input bar (@Ayush4958)
- fix the project name clipping issue for longer project names (@hellosamyak)
- Feature: recommended people name to add from RMarkDown & Quarto (@Ayush4958)
- fix: correctly increment userProfileDialogKey in setState (@aabhinavvvvvvv)
- style: remove dead css code in app.global.css (@adityai0)
- fix: remove duplicate URL key in AssetType constant (@aabhinavvvvvvv)
- fix: reset DataTable state on Expand All / Collapse All click (@aabhinavvvvvvv)
- fix: pass id and name through createStatWrapConfig for cloned projects (@aabhinavvvvvvv)
- fix(bug): Cancel "Edit Profile" doesn't discard changes (@adityai0)
- fix: UI rendering of Categories & Description attribute (@Ayush4958)
- fix: improve notes UX and add person delete confirmation (@aabhinavvvvvvv)
- Added functionality to open file from assets (@debangi29)
- fix(ui): update 'Open File' label to 'Open Folder' for folders (@adityai0)
- Made Uniform Title Background color for all cards (@dibyanshu-pal-kushwaha)
- Enhanced R Parameter parsing (@dibyanshu-pal-kushwaha)
- feat(assets): replace file actions with 'Open URL' for external assets (URL) (@adityai0)
- Added Confirming card before deleting the person in the table's view (@dibyanshu-pal-kushwaha)
- Perf: Exclude heavy directories from workflow rendering and align graph preprocessing (@hellosamyak)
- Fixing Typos & Grammatical mistakes (@dibyanshu-pal-kushwaha)
- Fixing Project Log Name issue (@dibyanshu-pal-kushwaha)
- feat: add java icon for the language support (@Ayush4958)
- Fix external URL handler signature in main.dev.js (@hellosamyak)
- Checklist file links should open in folder (@lrasmus)
- Create a detailed log entry when creating checklist (@lrasmus)
- Scrollbar for large project lists (@lrasmus)
- Remove references to defaultProps (@lrasmus)

New language support added in this version:

- C/C++ (@dibyanshu-pal-kushwaha)
- C# (@dibyanshu-pal-kushwaha)
- Dart (@adityai0)
- Go (@Ayush4958)
- JavaScript/TypeScript (@aabhinavvvvvvv)
- Julia (@aabhinavvvvvvv)
- Rust (@Ayush4958)
- Scala (@adityai0)
- SQL (@Ayush4958)

**Full Changelog**: https://github.com/StatTag/StatWrap/compare/0.0.20...0.0.21

## 0.0.20 - December 3, 2025

### Change Summary

- Fix issue with new project creation error message.

**Full Changelog**: https://github.com/StatTag/StatWrap/compare/0.0.19...0.0.20

## 0.0.19 - November 26, 2025

### Change Summary

- Improve search by excluding user folders from R, RStudio, Python, Jupyter, etc. from indexing.

**Full Changelog**: https://github.com/StatTag/StatWrap/compare/0.0.18...0.0.19

## 0.0.18 - November 20, 2025

### Change Summary

This release includes the "Search" feature, developed by our OSRE Summer of Reproducibility intern, @debangi29

**Full Changelog**: https://github.com/StatTag/StatWrap/compare/0.0.17...0.0.18

## 0.0.17 - September 19, 2025

### Change Summary

Many thanks to numerous contributions from the community.

- Allow filtering assets by attributes (@Abhijay007)
- Collapsible markdown sections in project About page (@debangi29)
- Detect offline projects that go online (@Abhijay007)
- Upgrade to React 18 (@Abhijay007)
- Allow organizing projects into Active and Past groups (@debangi29)
- Other dependency updates (@lrasmus)

**Full Changelog**: https://github.com/StatTag/StatWrap/compare/0.0.16...0.0.17

## 0.0.16 - May 22, 2025

### Change Summary

Many thanks to numerous contributions from the community.

- Enabled cloning projects (@debangi29)
- Added support for Java (@ayushkoli772)
- Fix tooltip visibility issue (@MinjanaAP)
- Fixed button to add project to favorites list (@debangi29)
- Allow user to update project display name (@lrasmus)
- Miscellaneous fixes and improvements (@lrasmus)
- Dependency updates (@lrasmus)

**Full Changelog**: https://github.com/StatTag/StatWrap/compare/0.0.15...0.0.16

## 0.0.15 - March 5, 2025

### Change Summary

Many thanks to numerous contributions from the community, including our [OSRE24 contributor](https://ucsc-ospo.github.io/report/osre24/ucsc/statwrap/20241102-adi/) @AdiAkhileshSingh15!

- **New "Reproducibility Checklist" feature** (@AdiAkhileshSingh15)
- Added +/- zoom control buttons for Workflow view (@Abhijay007)
- Added navigation to "entrypoint" assets (@AdiAkhileshSingh15)
- Added User Specific Time zone to Project logger (@Abhijay007)
- Added Cancel button when editing project details from Dashboard (@Abhijay007)
- Improved UI for note editing (@jayantpranjal0)
- Made project detail tooltip more responsive (@MinjanaAP)
- Dependency updates (@Abhijay007, @lrasmus, @AdiAkhileshSingh15)

**Full Changelog**: https://github.com/StatTag/StatWrap/compare/0.0.14...0.0.15

## 0.0.14 - February 12, 2024

- Dependency updates
- Documentation update from @vinfinity7
- Minor UI fixes / adjustments

## 0.0.13 - June 30, 2023

- Add TIER Protocol project template
- Shorten long strings in workflow graph view and filter list
- Fix issue with SAS %include statement parsing

## 0.0.12 - January 17, 2023

- Notifications when another user updates project assets
- Show R Markdown output in dependency graph
- Shorten dependency name label in graph
