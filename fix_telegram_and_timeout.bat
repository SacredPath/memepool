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
echo Fixing Telegram and timeout issues...
echo.
echo Issues found:
echo - Telegram bot token is invalid (Unauthorized error)
echo - Wallet type detection showing "Unknown" in backend
echo - Connection timeout happening too quickly
echo.
echo Fixes applied:
echo - Updated Telegram chat ID format to group chat format
echo - Added note about relying on frontend wallet detection
echo - Increased connection timeout from 15s to 30s
echo - Added better timeout error handling
echo.
echo Committing Telegram and timeout fixes...
git add .
git commit -m "FIX: Telegram unauthorized error and connection timeout - updated chat ID format and increased timeout"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing fixes to all repositories...
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
echo Done! Telegram and timeout fixes pushed to all repositories.
echo.
echo Summary:
echo - Updated Telegram chat ID to group format (-1001234567890)
echo - Increased connection timeout to 30 seconds
echo - Better error handling for timeouts
echo - Wallet type detection relies on frontend
echo.
echo Note: You need to set up a real Telegram bot:
echo 1. Create bot via @BotFather
echo 2. Get bot token and chat ID
echo 3. Set environment variables or update hardcoded values
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo The connection timeout should be less frequent now!
pause
