@echo off
REM Script untuk upload kode ke GitHub (Windows)
REM Usage: upload.bat

echo.
echo 🚀 Memulai upload ke GitHub...
echo.

REM Cek apakah git sudah diinstall
where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Git tidak terinstall. Silakan install git terlebih dahulu.
    pause
    exit /b 1
)

REM Inisialisasi git jika belum ada
if not exist ".git" (
    echo 📦 Inisialisasi Git repository...
    git init
)

REM Tambah semua file ke staging
echo 📝 Menambahkan file ke staging...
git add .

REM Commit
echo 💾 Commit perubahan...
git commit -m "feat: upload project to GitHub"

REM Set branch ke main
echo 🌿 Set branch ke main...
git branch -M main

REM Tambah remote jika belum ada
git remote | findstr "origin" >nul
if %errorlevel% neq 0 (
    echo 🔗 Menambahkan remote origin...
    git remote add origin https://github.com/rise-crystal/jasbug.git
)

REM Push ke GitHub
echo ⬆️  Push ke GitHub...
git push -u origin main

echo.
echo ✅ Upload selesai!
echo 📦 Repository: https://github.com/rise-crystal/jasbug
echo.
pause
