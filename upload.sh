#!/bin/bash

set -euo pipefail

# Script untuk push ke GitHub lalu deploy ke Vercel production
# Usage: chmod +x upload.sh && ./upload.sh

REPO_URL="https://github.com/rise-crystal/jasbug.git"
COMMIT_MESSAGE="${1:-chore: sync project to GitHub and Vercel}"

echo "🚀 Memulai sinkronisasi GitHub + Vercel..."
echo ""

# Cek dependency
if ! command -v git >/dev/null 2>&1; then
    echo "❌ Git tidak terinstall. Silakan install git terlebih dahulu."
    exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
    echo "❌ Vercel CLI tidak ditemukan. Install dengan: npm i -g vercel"
    exit 1
fi

# Inisialisasi git jika belum ada
if [ ! -d ".git" ]; then
    echo "📦 Inisialisasi Git repository..."
    git init
fi

echo "📝 Menambahkan file ke staging..."
git add -A

if git diff --cached --quiet; then
    echo "ℹ️  Tidak ada perubahan baru untuk di-commit."
else
    echo "💾 Commit perubahan..."
    git commit -m "$COMMIT_MESSAGE"
fi

echo "🌿 Set branch ke main..."
git branch -M main

if ! git remote | grep -q "^origin$"; then
    echo "🔗 Menambahkan remote origin..."
    git remote add origin "$REPO_URL"
fi

echo "⬆️  Push ke GitHub..."
git push -u origin main

if [ ! -f ".vercel/project.json" ]; then
    echo "🔗 Project belum terhubung ke Vercel. Menjalankan vercel link..."
    vercel link
fi

echo "🚀 Deploy ke Vercel production..."
vercel deploy --prod

echo ""
echo "✅ Sinkronisasi selesai!"
echo "📦 GitHub: $REPO_URL"
echo "☁️  Vercel production berhasil dipicu."
