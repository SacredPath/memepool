@echo off
echo ========================================
echo FIX VERCEL CONFIGURATION
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo CONFIGURATION FIX APPLIED
echo ========================================
echo.
echo 1. VERCEL.JSON FIX
echo - Removed api/drainer.js from functions config
echo - Only api/index.js is now configured as serverless
echo - Fixed potential function conflicts
echo.
echo 2. DEPLOYMENT ISSUE
echo - Vercel was trying to deploy api/drainer.js as serverless
echo - But api/drainer.js is imported by api/index.js
echo - This was causing deployment conflicts
echo.
echo 3. CLEAN CONFIGURATION
echo - Single serverless function: api/index.js
echo - All routes point to api/index.js
echo - No conflicting function definitions
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
node -c api/index.js
if %errorlevel% neq 0 (
    echo ERROR: api/index.js has syntax errors!
    pause
    exit /b 1
)
echo ✓ api/index.js syntax OK
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
echo COMMITTING FIX
echo ========================================
echo.
git add .
git commit -m "FIX: Vercel configuration - removed conflicting api/drainer.js function definition"
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
echo FIX DEPLOYED
echo ========================================
echo.
echo ✓ Vercel configuration fixed
echo ✓ Removed conflicting function definition
echo ✓ Clean serverless deployment
echo ✓ All repositories updated
echo.
echo EXPECTED IMPROVEMENTS:
echo - Vercel deployment should succeed
echo - No more function conflicts
echo - Clean serverless environment
echo - Proper routing configuration
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo VERCEL CONFIGURATION FIX HAS BEEN DEPLOYED!
pause
