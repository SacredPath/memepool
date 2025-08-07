@echo off
echo Adding Lombard repository as remote...
git remote add lombard https://github.com/SacredPath/Lombard.git
echo.
echo Fetching Lombard repository...
git fetch lombard
echo.
echo Checking current changes...
git status
echo.
echo Committing latest changes if any...
git add .
git commit -m "UPDATE: Telegram logging fixes and dynamic drain logic" --allow-empty
echo.
echo Pushing to Lombard main branch...
git push lombard master:main --force
echo.
echo Removing Lombard remote...
git remote remove lombard
echo.
echo Done! Updates pushed to Lombard repository.
pause
