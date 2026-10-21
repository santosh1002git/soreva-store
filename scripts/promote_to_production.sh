#!/usr/bin/env bash
# ==============================================================================
# Sorèva Luxury Store - Promotion from Development to Production
# Promotes tested changes from branch 'development' into 'production' & 'main'
# ==============================================================================
set -e

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)

echo "🔍 Current branch: $CURRENT_BRANCH"

# 1. Verify working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️ Working directory has uncommitted changes. Staging and committing to development..."
    git add .
    git commit -m "Auto-commit development changes before promotion"
fi

# 2. Push latest development changes
echo "🚀 Pushing latest changes to origin/development..."
git push origin development

# 3. Switch to production and merge development
echo "🔀 Merging development into production..."
git checkout production
git pull origin production --ff-only || true
git merge development -m "Promote development to production release"

# 4. Push production to GitHub
echo "🌐 Pushing updated production release to GitHub..."
git push origin production

# 5. Keep main branch in sync
echo "🔄 Synchronizing main branch..."
git checkout main
git merge production -m "Sync main with production release"
git push origin main

# 6. Switch back to development
echo "⬅️ Returning to development branch for continued work..."
git checkout development

echo ""
echo "=========================================================="
echo "🎉 PROMOTION COMPLETE! Production is updated on GitHub."
echo "To apply changes to your live AWS production server, run:"
echo ""
echo "  cd /var/www/soreva-production && git pull origin production && sudo systemctl restart soreva-production"
echo "=========================================================="
