@echo off
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
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
echo Checking current branch...
git branch --show-current
echo.
echo Adding Lombard repository as remote...
git remote add lombard https://github.com/SacredPath/Lombard.git
echo.
echo Fetching Lombard repository...
git fetch lombard
echo.
echo Force pushing current branch to Lombard main (overwriting main branch)...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
git push lombard %CURRENT_BRANCH%:main --force
echo.
echo Deleting master branch from Lombard remote (if it exists)...
git push lombard --delete master 2>nul || echo Master branch does not exist on Lombard
echo.
echo Removing Lombard remote...
git remote remove lombard
echo.
echo Done! Lombard main branch has been overwritten.
echo.
echo Summary:
echo - Lombard main branch now contains all latest changes
echo - All Telegram logging fixes are now in Lombard
pause
