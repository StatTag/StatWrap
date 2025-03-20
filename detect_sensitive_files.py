import os
import subprocess

# Read the list of sensitive files from .sensitive
def get_sensitive_files():
    try:
        with open(".sensitive", "r") as file:
            return [line.strip() for line in file.readlines()]
    except FileNotFoundError:
        return []

# Get a list of staged files in Git
def get_staged_files():
    result = subprocess.run(["git", "diff", "--cached", "--name-only"], capture_output=True, text=True)
    return result.stdout.splitlines()

# Detect sensitive files before commit
def check_sensitive_files():
    sensitive_files = get_sensitive_files()
    staged_files = get_staged_files()

    flagged_files = [file for file in staged_files if file in sensitive_files]

    if flagged_files:
        print("\n⚠ WARNING: You are trying to commit the following sensitive files:")
        for file in flagged_files:
            print(f" - {file}")
        print("\nConsider adding them to .gitignore or removing them.")
        exit(1)

if __name__ == "_main_":
    check_sensitive_files()
