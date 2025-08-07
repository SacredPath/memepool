@echo off
echo Checking current branch and remotes...
git branch -a
echo.
echo Current branch: 
git branch --show-current
echo.
echo Committing latest changes...
git add .
git commit -m "FIX: Telegram logging function calls updated to use new API"
echo.
echo Checking which branches exist on remote...
git ls-remote --heads origin
echo.
echo Pushing to origin master (current branch)...
git push origin master
echo.
echo Also pushing to origin main if it exists...
git push origin master:main
echo Done!
pause
