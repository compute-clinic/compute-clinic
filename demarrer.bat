@echo off
rem ComputeClinic - lanceur Windows : execute demarrer.sh avec le Bash de Git for Windows.
rem Usage : double-clic, ou dans un terminal :  demarrer.bat [tester|etat|arreter|journaux X|repeupler]
chcp 65001 >nul
setlocal
set "BASH="
for %%B in ("%ProgramFiles%\Git\bin\bash.exe" "%ProgramFiles(x86)%\Git\bin\bash.exe" "%LocalAppData%\Programs\Git\bin\bash.exe") do (
  if exist %%B if not defined BASH set "BASH=%%~B"
)
if not defined BASH (
  for /f "delims=" %%G in ('where git 2^>nul') do if not defined BASH if exist "%%~dpG..\bin\bash.exe" set "BASH=%%~dpG..\bin\bash.exe"
)
if not defined BASH (
  echo [ECHEC] Git for Windows est introuvable. Installez-le : https://git-scm.com/download/win
  pause
  exit /b 1
)
"%BASH%" "%~dp0demarrer.sh" %*
set CODE=%ERRORLEVEL%
if "%~1"=="" pause
exit /b %CODE%