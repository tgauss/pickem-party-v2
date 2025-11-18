# Automated Weekly Settlement Setup Guide

This guide explains how to set up automatic weekly settlement for Pickem Party that runs every Monday night at 10:00 PM PST.

---

## 🎯 What Gets Automated

The auto-settlement process:
1. ✅ Checks if all games for the week are FINAL
2. ✅ Processes all picks and marks them correct/incorrect
3. ✅ Applies life deductions to players with losing picks
4. ✅ Marks eliminated players
5. ✅ Logs all actions for review

**Safety Features:**
- Only runs if ALL games are final (no partial settlements)
- Prevents duplicate processing (checks if picks already marked)
- Dry-run mode available for testing
- Requires secret token for security

---

## 🚀 Option 1: Vercel Cron Jobs (Recommended)

**Requirements:** Vercel Pro plan ($20/month)

### Setup Steps:

1. **Add cron secret to Vercel environment variables:**
   ```bash
   # In Vercel dashboard: Settings > Environment Variables
   CRON_SECRET=your-secret-token-here-make-it-long-and-random
   ```

2. **Deploy with vercel.json:**
   The `vercel.json` file is already configured:
   ```json
   {
     "crons": [
       {
         "path": "/api/admin/auto-settle-week",
         "schedule": "0 5 * * 2"
       }
     ]
   }
   ```

   **Schedule:** `0 5 * * 2` = Every Tuesday at 5:00 AM UTC (Monday 10:00 PM PST)

3. **Deploy to Vercel:**
   ```bash
   git add vercel.json src/app/api/admin/auto-settle-week/route.ts
   git commit -m "Add automated weekly settlement"
   git push
   ```

4. **Verify in Vercel Dashboard:**
   - Go to your project > Settings > Cron Jobs
   - You should see the scheduled job listed

### Manual Testing:

```bash
curl -X POST https://www.pickemparty.app/api/admin/auto-settle-week \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-secret-token" \
  -d '{"week": 11, "dryRun": true}'
```

---

## 🚀 Option 2: GitHub Actions (Free Alternative)

**Requirements:** GitHub repository

### Setup Steps:

1. **Add secrets to GitHub:**
   - Go to repository > Settings > Secrets and variables > Actions
   - Add these secrets:
     - `CRON_SECRET`: Your secret token
     - `APP_URL`: `https://www.pickemparty.app`

2. **Enable GitHub Actions:**
   The workflow file is already in `.github/workflows/weekly-settlement.yml`

3. **Deploy:**
   ```bash
   git add .github/workflows/weekly-settlement.yml
   git commit -m "Add GitHub Actions weekly settlement"
   git push
   ```

4. **Verify:**
   - Go to repository > Actions tab
   - You should see "Weekly NFL Settlement" workflow
   - It will run every Monday at 10:00 PM PST

### Manual Trigger:

- Go to Actions > Weekly NFL Settlement
- Click "Run workflow"
- Optionally specify week number or enable dry-run

---

## 🚀 Option 3: Standalone Cron Script

**Requirements:** Server with cron (Linux, Mac, or Windows Task Scheduler)

### Setup Steps:

1. **Make script executable:**
   ```bash
   chmod +x cron-settlement.js
   ```

2. **Set environment variables:**
   ```bash
   export APP_URL="https://www.pickemparty.app"
   export CRON_SECRET="your-secret-token"
   ```

3. **Add to crontab:**
   ```bash
   crontab -e
   ```

   Add this line (runs Monday 10pm PST):
   ```
   0 22 * * 1 cd /path/to/pickem-party && /usr/bin/node cron-settlement.js >> /var/log/pickem-settlement.log 2>&1
   ```

4. **Test manually:**
   ```bash
   node cron-settlement.js --dry-run
   ```

---

## 🚀 Option 4: Railway.app / Render.com

Both platforms support cron jobs for free/cheap:

### Railway:

1. Add `railway.toml`:
   ```toml
   [deploy]
   startCommand = "node cron-settlement.js"

   [cron]
   schedule = "0 22 * * 1"
   command = "node cron-settlement.js"
   ```

### Render:

1. Create a Cron Job service
2. Set command: `node cron-settlement.js`
3. Set schedule: `0 22 * * 1` (Monday 10pm PST)
4. Add environment variables

---

## ⚙️ Configuration

### Schedule Format (Cron Expression)

```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 6) (0=Sunday)
│ │ │ │ │
* * * * *
```

**Common schedules:**
- `0 5 * * 2` - Tuesday 5am UTC (Monday 10pm PST)
- `0 6 * * 2` - Tuesday 6am UTC (Monday 10pm PST during DST)
- `30 4 * * 2` - Tuesday 4:30am UTC (Monday 8:30pm PST)

### Environment Variables

Required:
- `CRON_SECRET` - Secret token for authentication
- `NEXT_PUBLIC_SUPABASE_URL` - Already set
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Already set

Optional:
- `APP_URL` - Only for standalone script

---

## 🧪 Testing

### Test with Dry Run:

```bash
# Via API
curl -X POST https://www.pickemparty.app/api/admin/auto-settle-week \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-secret-token" \
  -d '{"week": 11, "dryRun": true}'

# Via standalone script
node cron-settlement.js --dry-run
```

### Check Status:

```bash
curl -X GET https://www.pickemparty.app/api/admin/auto-settle-week \
  -H "x-cron-secret: your-secret-token"
```

### Expected Response:

```json
{
  "success": true,
  "week": 11,
  "gamesProcessed": 15,
  "picksProcessed": 7,
  "lifeDeductions": 1,
  "eliminations": ["Player Name"],
  "errors": [],
  "message": "Week 11 settled: 7 picks processed, 1 life deductions, 1 eliminations",
  "timestamp": "2025-11-18T06:00:00.000Z"
}
```

---

## 🔍 Monitoring & Logs

### Vercel:
- View logs in Vercel dashboard > Deployments > Functions
- Logs appear under the cron execution

### GitHub Actions:
- View logs in repository > Actions > Workflow runs
- Each run shows detailed step-by-step logs

### Standalone Script:
- Logs to stdout (redirect to file in cron)
- Example: `>> /var/log/pickem-settlement.log 2>&1`

---

## 🔒 Security

1. **Secret Token:**
   - Use a long, random string (minimum 32 characters)
   - Generate: `openssl rand -base64 32`
   - Store in environment variables, never commit to git

2. **API Endpoint:**
   - Only accessible with valid `x-cron-secret` header
   - Returns 401 Unauthorized without correct token

3. **Rate Limiting:**
   - Consider adding rate limiting if concerned about abuse
   - Vercel has built-in DDoS protection

---

## 🚨 Troubleshooting

### Settlement didn't run:

1. Check cron schedule (timezone issues?)
2. Verify secret token is correct
3. Check if all games are final
4. Review logs for errors

### Games not all final yet:

The API will return:
```json
{
  "success": false,
  "message": "Week 11 not ready: 2 games still in progress",
  "errors": ["DAL @ LV", "KC @ BUF"]
}
```

This is normal - it will retry next time.

### Duplicate processing prevention:

The script checks `is_correct` field:
- If `null` → processes the pick
- If already set → skips (already processed)

This prevents double-processing if run multiple times.

---

## 📊 What Happens After Settlement

Once settlement completes:

1. ✅ All picks marked correct/incorrect
2. ✅ Life deductions applied
3. ✅ Eliminations recorded with week number
4. ✅ Players can see updated standings
5. 📧 (Future) Email notifications sent to eliminated players

---

## 🎯 Recommended Setup

**For Production:**
- Use **Vercel Cron** if you have Pro plan (most reliable)
- Use **GitHub Actions** if on free tier (good alternative)

**For Development:**
- Use **standalone script** with `--dry-run` flag
- Test manually before enabling automation

---

## 📝 Manual Settlement (Backup)

If automation fails, you can always run settlement manually:

```bash
# Using existing scripts
node settle-week10.js  # Or whatever week
```

Or trigger via API:
```bash
curl -X POST https://www.pickemparty.app/api/admin/auto-settle-week \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your-secret-token" \
  -d '{"week": 11}'
```

---

## 🔄 Next Steps After Setup

1. Test with dry-run mode first
2. Monitor the first few automated runs
3. Set up notifications (email/Slack) for failures
4. Add to your weekly routine: review Monday night for any issues
5. Consider adding email notifications to players after settlement

---

## 💡 Future Enhancements

Potential improvements:
- [ ] Email notifications to eliminated players
- [ ] Slack/Discord notifications for commissioners
- [ ] Weekly recap email generation
- [ ] Automatic social media posts with standings
- [ ] Integration with weekly recap page generation

---

**Questions?** Check the logs first, then refer to this guide. The system is designed to be safe and recoverable!
