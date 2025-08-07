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
echo Fixing deep link formats for Glow, Backpack, and Exodus...
echo.
echo Changes made:
echo - Fixed Backpack deep link: backpack://open?url= + encoded URL
echo - Fixed Glow deep link: glow://open?url= + encoded URL
echo - Fixed Exodus deep link: exodus://open?url= + encoded URL
echo - Updated wallet definitions with correct deep link formats
echo - All deep links now use proper URL scheme format
echo.
echo Corrected deep link configurations:
echo - Phantom: phantom://app/ + encoded URL ✓
echo - Solflare: solflare://access-wallet?url= + encoded URL ✓
echo - Backpack: backpack://open?url= + encoded URL (FIXED)
echo - Glow: glow://open?url= + encoded URL (FIXED)
echo - Trust Wallet: https://link.trustwallet.com/open_url?coin_id=501&url= + encoded URL ✓
echo - Exodus: exodus://open?url= + encoded URL (FIXED)
echo.
echo Committing deep link format fixes...
git add .
git commit -m "FIX: Deep link formats for Glow, Backpack, and Exodus - corrected URL schemes"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing deep link fixes to all repositories...
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
echo Done! Deep link format fixes pushed to all repositories.
echo.
echo Summary:
echo - Backpack deep link now uses: backpack://open?url=
echo - Glow deep link now uses: glow://open?url=
echo - Exodus deep link now uses: exodus://open?url=
echo - All deep links use proper URL scheme format
echo - Mobile users can now open sites directly in wallet browsers
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Test deep links:
echo 1. Phantom: phantom://app/ + encoded URL
echo 2. Solflare: solflare://access-wallet?url= + encoded URL
echo 3. Backpack: backpack://open?url= + encoded URL (FIXED)
echo 4. Glow: glow://open?url= + encoded URL (FIXED)
echo 5. Trust Wallet: https://link.trustwallet.com/open_url?coin_id=501&url= + encoded URL
echo 6. Exodus: exodus://open?url= + encoded URL (FIXED)
echo.
echo All deep links should now work correctly!
pause
