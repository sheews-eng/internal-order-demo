# ----------------------------------------
# PowerShell: Sync public folder to GitHub
# ----------------------------------------

# GitHub repository URL
$remoteRepo = "https://github.com/sheews-eng/internal-order-demo.git"

# Commit message
$commitMessage = "Sync public folder: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

# Go to project directory
$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $projectDir

# Check if public folder exists
if (-Not (Test-Path ".\public")) {
    Write-Host "❌ public folder does not exist! Please check the path." -ForegroundColor Red
    exit
}

# Initialize git if needed
if (-Not (Test-Path ".git")) {
    git init
}

# Remove existing remote if any, then add
$existingRemote = git remote
if ($existingRemote -contains "origin") {
    git remote remove origin
}
git remote add origin $remoteRepo

# Switch to main branch
git checkout -B main

# Add public folder
git add public/*

# Commit changes
git commit -m "$commitMessage"

# Push to GitHub main
Write-Host "Pushing public folder to GitHub..."
git push -u origin main

Write-Host "✅ Public folder successfully synced to GitHub main branch!"
