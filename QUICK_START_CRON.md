# Quick Start: Automated Weekly Settlement

## 🚀 5-Minute Setup (Vercel)

### 1. Add Environment Variable

In Vercel Dashboard:
```
Settings > Environment Variables > Add New

Name: CRON_SECRET
Value: [generate random string]
```

Generate secret:
```bash
openssl rand -base64 32
```

### 2. Deploy

```bash
git add .
git commit -m "Add automated weekly settlement"
git push
```

### 3. Verify

Check Vercel Dashboard > Settings > Cron Jobs

You should see:
- **Path**: `/api/admin/auto-settle-week`
- **Schedule**: `0 5 * * 2` (Monday 10pm PST)

### 4. Test (Optional)

```bash
# Dry run (no database changes)
curl -X POST https://www.pickemparty.app/api/admin/auto-settle-week \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: YOUR_SECRET_HERE" \
  -d '{"week": 11, "dryRun": true}'
```

Or use the test script:
```bash
export CRON_SECRET="your-secret"
./test-auto-settle.sh 11 --dry-run
```

---

## ✅ Done!

Every Monday at 10pm PST, the system will:
1. Check if all games are final
2. Process picks (correct/incorrect)
3. Apply life deductions
4. Mark eliminations

**No more manual settlement needed!**

---

## 🔍 Check Status Anytime

```bash
curl https://www.pickemparty.app/api/admin/auto-settle-week \
  -H "x-cron-secret: YOUR_SECRET_HERE"
```

---

## 📚 Full Documentation

See [AUTO_SETTLEMENT_SETUP.md](AUTO_SETTLEMENT_SETUP.md) for:
- Alternative deployment options (GitHub Actions, Railway, etc.)
- Troubleshooting guide
- Advanced configuration
- Monitoring setup

---

## ⚠️ Important Notes

- **Vercel Cron requires Pro plan** ($20/mo)
- Free alternative: GitHub Actions (see full docs)
- Settlement only runs if ALL games are final
- Safe to run multiple times (won't duplicate)
- Check logs Monday night to verify
