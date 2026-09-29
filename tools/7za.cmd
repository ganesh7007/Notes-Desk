@echo off
rem Tolerant 7za wrapper for electron-builder on machines without the
rem SeCreateSymbolicLinkPrivilege (no admin / no Developer Mode).
rem The winCodeSign archive contains macOS "darwin" symlinks that fail to
rem extract on such machines; those tools are unused for Windows builds.
rem Any other 7za error is passed through unchanged.
setlocal
set "REAL7ZA=C:\Users\jambu\Desktop\Eleven,nami\notes\node_modules\7zip-bin\win\x64\7za.exe"
set "OUT=%TEMP%\7za-wrapper-%RANDOM%.log"
"%REAL7ZA%" %* > "%OUT%" 2>&1
set "EC=%ERRORLEVEL%"
type "%OUT%"
if "%EC%"=="2" findstr /C:"Cannot create symbolic link" "%OUT%" >nul 2>&1 && set "EC=0"
del "%OUT%" >nul 2>&1
exit /b %EC%
