# Sorèva Store - Agent Operational Guidelines & Rules

## 🌿 Environment & Branching Rules
1. **Primary Working Branch is `development`**:
   - ALL code modifications, feature developments, bug fixes, UI enhancements, and script updates MUST be made on the `development` branch.
   - Never make direct commits or edits to the `production` or `main` branches unless explicitly asked to execute a promotion.
   - Always ensure local work is on `development` (`git checkout development`).

2. **Promotion to Production Protocol**:
   - Only promote when the user explicitly requests: *"promote to production"*, *"deploy to production"*, or *"publish live"*.
   - When requested, run `scripts/promote_to_production.sh` (or merge `development` into `production`, push to `origin/production` and `origin/main`, then switch back to `development`).
   - Remind the user to pull on the live AWS server (`cd /var/www/soreva-production && git pull origin production && sudo systemctl restart soreva-production`).

3. **Security & Secrets**:
   - Never commit `data/razorpay-config.json`, `data/czm-credentials.json`, `server.log`, or `.env`.
   - Maintain `.env.development.example` and `.env.production.example` as clean reference templates.
