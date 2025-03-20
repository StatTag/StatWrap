@echo off
setlocal enabledelayedexpansion

:: List of sensitive files to check
set SENSITIVE_FILES=(".env" "config\secrets.json" "private_keys.pem" "my_sensitive_file.txt")

:: Get staged files
for /f "delims=" %%F in ('git diff --cached --name-only') do (
    for %%S in (%SENSITIVE_FILES%) do (
        if "%%F"=="%%S" (
            echo ❌ ERROR: You are trying to commit a sensitive file: %%F
            echo ⚠  Please remove it from staging before committing.
            exit /b 1
        )
    )
)

exit /b 0
