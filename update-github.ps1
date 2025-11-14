# update-github.ps1
# 自动添加、提交、push 更新到 GitHub

# 进入脚本所在目录
Set-Location -Path $PSScriptRoot

# 检查 Git 仓库
if (-not (Test-Path ".git")) {
    Write-Host "当前目录不是 Git 仓库，请确认路径正确" -ForegroundColor Red
    exit
}

# 拉取最新远程更新
git pull origin main

# 添加所有修改
git add .

# 自动提交，使用当前时间作为信息
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
git commit -m "Auto update: $timestamp"

# Push 到远程
git push origin main

Write-Host "✅ 已成功更新到 GitHub!" -ForegroundColor Green
