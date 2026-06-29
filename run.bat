@echo off
setlocal

cd /d "%~dp0"

if "%TEST_SUITE%"=="" set "TEST_SUITE=checkout"
if /I "%TEST_SUITE%"=="null" set "TEST_SUITE=checkout"

echo Running Swagify automation from %CD%
echo Selected TEST_SUITE=%TEST_SUITE%

call npm ci
if errorlevel 1 exit /b %ERRORLEVEL%

call npx.cmd playwright install chromium
if errorlevel 1 exit /b %ERRORLEVEL%

if /I "%TEST_SUITE%"=="checkout" (
  echo Running command: npm run test:checkout
  call npm run test:checkout
) else if /I "%TEST_SUITE%"=="smoke" (
  echo Running command: npm run test:ci
  call npm run test:ci
) else if /I "%TEST_SUITE%"=="full" (
  echo Running command: npm test
  call npm test
) else (
  echo Unknown TEST_SUITE "%TEST_SUITE%". Use checkout, smoke, or full.
  exit /b 1
)

set "TEST_EXIT_CODE=%ERRORLEVEL%"

call npm run dashboard

exit /b %TEST_EXIT_CODE%
