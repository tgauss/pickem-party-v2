# Make.com Pick Backup Setup (5 Minutes)

## 🎯 What This Does
Every time someone makes or updates a pick, it automatically creates a row in your Google Sheet. Super simple!

## 📋 Setup Steps

### Step 1: Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create new sheet: `Pickem Party Backup`
3. Add headers in Row 1:
   ```
   timestamp | user_id | username | display_name | league_name | week | team_name | team_key | action | season
   ```

### Step 2: Create Make.com Scenario
1. Go to [Make.com](https://make.com)
2. Click **Create a New Scenario**
3. Add **Webhooks** module:
   - Choose "Custom webhook" 
   - Click **Add** and copy the webhook URL (save this!)
4. Add **Google Sheets** module:
   - Choose "Add a Row"
   - Connect your Google account
   - Select your "Pickem Party Backup" sheet
   - Map the fields:
     ```
     timestamp → A (timestamp)
     user_id → B (user_id)
     username → C (username)
     display_name → D (display_name)
     league_name → E (league_name)
     week → F (week)
     team_name → G (team_name)
     team_key → H (team_key)
     action → I (action)
     season → J (season)
     ```
5. Click **Save** and **Turn ON** the scenario

### Step 3: Add Webhook to Vercel
1. Go to your [Vercel Dashboard](https://vercel.com)
2. Navigate to Pickem Party project
3. **Settings > Environment Variables**
4. Add:
   - Name: `MAKE_WEBHOOK_URL`
   - Value: [Your webhook URL from Step 2]
   - Environment: Production
5. Click **Save**

### Step 4: Test It
1. Deploy your app (it will auto-deploy from GitHub)
2. Make a test pick
3. Check your Google Sheet - should see the pick within 10 seconds!

## ✅ You're Done!

Your backup system will now:
- ✅ Log every single pick to Google Sheets
- ✅ Show NEW vs UPDATE picks
- ✅ Include user info and team details
- ✅ Never slow down or break pick submissions
- ✅ Work even if Make.com is temporarily down

## 🔍 Example Row
```
2025-01-03T15:30:45Z | user123 | tgauss | Taylor G | GRID2025 | 2 | Baltimore Ravens | BAL | NEW | 2025
```

## 🛠 Troubleshooting
- **No data appearing?** Check webhook URL is correct in Vercel
- **Scenario not triggering?** Test the webhook in Make.com first
- **Wrong data format?** Verify field mapping in Google Sheets module

That's it! Super simple and bulletproof. 🚀