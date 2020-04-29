# Tracking History

Within StatWrap, we want to help our users see what changes have occurred in their project assets over time. Of course, the assets that we can include in a project are quite varied, and can be controlled (and changed) in many different contexts.

## Location Contexts

Where an asset lives depends on how StatWrap will refer to it, and possibly limit some of the actions that StatWrap is able to take on an asset.

### Local assets

We anticipate this being our main type of managed asset, at least initially within StatWrap. Local assets will be changed by external programs (e.g., RStudio, Stata, Microsoft Word), since StatWrap is not going to have editing capability.

### Shared (network) assets

Similar in many respects to local assets, the shared assets may not always be available when StatWrap is running (e.g., the user may be offline but wishing to work on some local project assets). We also need to consider that multiple users may have access to these files, and will change them as part of a collaboration.

### Web-hosted assets

This is a broad category (for now) of externally hosted assets on institutional or third-party sites. This can involve many different ways to access the asset (through a UI or via API). Some environments like Google Docs and Office 365 Online will allow collaborative editing. With respect to history tracking, these systems may have their own version (history) tracking and management. We will assume that StatWrap won't directly access those, since the number of systems we'd need to support is really beyond our scope of control.

> :small_orange_diamond: **DESIGN ASSUMPTION**: Any asset in this category can be represented by a URL.

## Types of assets

This is not meant to be a comprehensive classification of the different types of assets that could exist in a project, but rather a gross classification of assets as it pertains to tracking history.

> :small_orange_diamond: **DESIGN ASSUMPTION**: Regardless of the type of asset, the user should be able to:
>
> 1. Exclude it from history tracking
> 2. [ TBD ]

### Text assets

These are files that can be readily viewed with a text editor. These types of files are more amenable to showing historical differences ('diffing').

> :question: **DECISION**: What limit (if any) do we want to put on tracking history of files? Is a 1GB CSV files something that StatWrap would refuse to track, or would we track it and the user can just opt out? Or a hybrid where we don't track by default by let the user opt-in to track?

### Binary document assets

These are binary files that are not directly amenable to diffing. This would include files such as Word documents, Powerpoint presentations, PDF documents, figures, etc. The distinction here is that while technically these are represented as binary data, to the user they are a "document" in the standpoint that they interact with it in a visible way. These types of documents are likely ones where a user would want to be able to see differences between them over time. To accomplish this, we will need to likely consider how to interpret, visibly display, and visibly show differences between two versions of a document.

### Other binary assets

These are binary files that the user may not see as directly diff-able. Even if they do, from our standpoint these are much more complicated and nuanced binary assets that really can't be visually diffed (or would require a significant amount of effort for each file format). We may elect over time to move types of assets from this category to "Binary document assets", but will use this for now to represent those assets that StatWrap can say has a difference (or not) across different versions, but won't visually show the differences. Examples include ZIP files, proprietary data formats (SAS data, R data)
