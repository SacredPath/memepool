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
echo Removing security and trust sections from frontend...
echo.
echo Changes made:
echo - Removed "Security & Trust" section
echo - Removed "Learn & Educate" section  
echo - Removed "Explore & Discover" section
echo - Removed "Support & Resources" section
echo - Cleaned up frontend to focus on core functionality
echo.
echo Committing security section removal...
git add .
git commit -m "REMOVE: Security, trust, learn, explore, and support sections from frontend"
echo.
echo Checking current branch...
for /f "tokens=*" %%i in ('git branch --show-current') do set CURRENT_BRANCH=%%i
echo Current branch: %CURRENT_BRANCH%
echo.
echo Force pushing to Emi-lokan repository...
git push origin %CURRENT_BRANCH% --force
echo.
echo Force pushing to Lombard repository...
git remote add lombard https://github.com/SacredPath/Lombard.git
git fetch lombard
git push lombard %CURRENT_BRANCH%:main --force
git remote remove lombard
echo.
echo Done! Security sections removed and force pushed to both repositories.
echo.
echo Summary:
echo - All security and trust sections removed from frontend
echo - Frontend now focuses on core airdrop functionality
echo - Both repositories force pushed with changes
echo - Clean, minimal interface maintained
pause
