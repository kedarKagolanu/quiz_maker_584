@echo off
setlocal enabledelayedexpansion

set "ROOT_DIR=%~1"
if "!ROOT_DIR!"=="" set "ROOT_DIR=%CD%"
set "OUTPUT_FILE=directory_contents.txt"

echo Scanning directory: !ROOT_DIR!
echo This will take .gitignore into account and may take a while...

:: Remove existing output file
if exist "!OUTPUT_FILE!" del "!OUTPUT_FILE!"

:: Function to check if a path should be ignored
set "GITIGNORE_CHECK="
for /f "delims=" %%I in ('dir /b /s /a-d "!ROOT_DIR!\.gitignore" 2^>nul') do (
    set "GITIGNORE_CHECK=YES"
)

:: Recursively process files
for /r "!ROOT_DIR!" %%F in (*) do (
    set "FILE_PATH=%%F"
    set "REL_PATH=!FILE_PATH:%ROOT_DIR%=!"
    set "REL_PATH=!REL_PATH:~1!"
    
    set "IGNORE=NO"
    
    :: Basic .gitignore check (simplified)
    if "!GITIGNORE_CHECK!"=="YES" (
        echo !REL_PATH! | findstr /i "\.git" >nul && set "IGNORE=YES"
    )
    
    if "!IGNORE!"=="NO" (
        echo. >> "!OUTPUT_FILE!"
        echo File: %%F >> "!OUTPUT_FILE!"
        echo ======================================== >> "!OUTPUT_FILE!"
        type "%%F" >> "!OUTPUT_FILE!" 2>nul
        echo. >> "!OUTPUT_FILE!"
        echo ======================================== >> "!OUTPUT_FILE!"
        echo. >> "!OUTPUT_FILE!"
    )
)

echo Done! Check !OUTPUT_FILE! for results.