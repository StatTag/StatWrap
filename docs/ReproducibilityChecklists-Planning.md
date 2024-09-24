# Reproducible Research Checklists

This document provides design guidance and general requirements for the reproducible research checklist feature in StatWrap.

## Modes of Operation

There are two modes of operation for the checklist:

### 1. Automated information gathering / decision making (StatWrap)

StatWrap will use information from project assets and user-entered metadata in order to provide information about reproducible research practices.  This will be used to **inform** users, but will not make a binary indicator (yes/no) about if a practice is "reproducible" or not.

StatWrap should be configured to provide information about the following categories of data.  The way the data could be displayed is noted, but is not intended to limit the final implementation.  For each of these, there should be a service method that is able to perform the processed logic.  Unlike the actual checklist UI, these items are not configurable by the end user, they are built within StatWrap.

1. **Summarize the software used** - this should include programming language(s) and dependencies.  Programming languages can be inferred from file extensions.  Dependencies can be inferred from specific references in code files (already processed by StatWrap), as well as dependency files used for specific languages (e.g., `requirements.txt` for Python).  StatWrap does not need to determine the specific version used in any environment if it is not specified elsewhere.
2. **Multiple versions of a file** - use a heuristic from file names to determine if the user has versioned files using a naming convention, as opposed to using source control. For example, `main_analysis.R` and `main_analysis_v2.R` or `main_analysis-jd.R`.  StatWrap could use metrics other than the file name, such as similarity of file content, to further infer if the files are likely versioned.  For a grouping of files that StatWrap thinks are versioned, it should check attributes to:

    1. See if any of the files are marked as 'archived'.
    2. If more than one file is marked as an 'entry point'.

4. **Location of project documentation** - StatWrap should detect the presence of a README file (any extension), and if there is a folder named `doc`, `docs`, or `documentation`.  If so, display these file(s)/folder(s) as the projecct documentation.
5. **Absolute paths used** - StatWrap should detect if explicit absolute paths are used within the code files within a project.  This should detect across Mac, Linux, and Windows, including multiple ways of denoting paths across OS (e.g., on Windows languages like R will let you reference `C:/test/file.csv` or `C:\test\file.csv`), as well as fully qualified network paths (e.g., `\\research\files\test.csv`).  StatWrap should report which file(s) are using absolute paths.
6. **Binary / proprietary file formats for data** - flag data files that are not purely text-based.  This can be done from a configureable list of file extensions.
7. **List categories of data files/folders** - using user-assigned attributes, or folder naming conventions, display the list of files associated with different categories of data:
	1. Input data - data flagged with an attribute of "Input / Raw Data", or data contained in folders using a configurable list of folder names (e.g., `raw`, `input`)
	2. Derived data - data flagged with an attribute of "Derived", or data contained in folders using a configurable list of folder names (e.g., `output`, `derived`)
	3. Data (general) - data files that we cannot otherwise categorize
8. **List categories of code files/folders** - using user-assigned attributes, or folder naming conventions, display the list of code files associated with different processing steps.  Note that a single code file may have multiple annotations:
   1. Data acquisition - used to import / pull data. This would be flagged with an attribute of "Data acquisition".
   2. Data processing - this would be flagged with an attribute of "Data processing"
   3. Analysis - this would be flagged with an attribute of "Analysis"
9. **Entry points** - StatWrap should list all code files flagged as entry points by the user.  If none, and code files exist, this should also be noted ("No entry point has been specified").  This could be combined with the previous item.
10. **External assets** - identify references in the code to: databases, APIs, web URLs that contain data.  Summarize these for the user as external assets that are being referenced.

### 2. Human-entered information / decision making (user)

This is more of the traditional "checklist", where the user is presented with a list of questions that they may attest to.  Some of the answers may be pre-filled using data collected by StatWrap as defined in the automated information gathering (previous section).

(See proposal by Adi)
