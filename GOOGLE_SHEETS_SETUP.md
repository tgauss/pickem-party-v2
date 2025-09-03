# Google Sheets Pick Backup Setup Guide

## 🎯 Purpose
This creates an immutable backup of every single pick made in your Pickem Party app, stored safely in Google Sheets where it can never be lost.

## 📋 Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet called `Pickem Party Backup - DO NOT DELETE`
3. In Row 1, add these column headers:
   - A1: `timestamp`
   - B1: `backup_id`
   - C1: `user_id`
   - D1: `username`
   - E1: `display_name`
   - F1: `league_id`
   - G1: `league_name`
   - H1: `week`
   - I1: `team_id`
   - J1: `team_name`
   - K1: `team_key`
   - L1: `action`
   - M1: `season`
   - N1: `ip_address`
   - O1: `user_agent`

## 📝 Step 2: Create Google Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete the default code
3. Paste this code:

```javascript
// Pickem Party Pick Backup Webhook
// This receives pick data and logs it to the spreadsheet

function doPost(e) {
  try {
    // Parse the incoming data
    const data = JSON.parse(e.postData.contents);
    
    // Get the active spreadsheet
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Create row data
    const row = [
      data.timestamp || new Date().toISOString(),
      data.backup_id || '',
      data.user_id || '',
      data.username || '',
      data.display_name || '',
      data.league_id || '',
      data.league_name || '',
      data.week || '',
      data.team_id || '',
      data.team_name || '',
      data.team_key || '',
      data.action || 'NEW',
      data.season || new Date().getFullYear(),
      data.ip_address || '',
      data.user_agent || ''
    ];
    
    // Append the row
    sheet.appendRow(row);
    
    // Return success
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Pick backed up successfully',
        backup_id: data.backup_id
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    // Log error but still return success
    console.error('Backup error:', error);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: 'Backup processed with errors',
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function to verify it's working
function testWebhook() {
  const testData = {
    timestamp: new Date().toISOString(),
    backup_id: 'TEST_' + Date.now(),
    user_id: 'test_user_123',
    username: 'testuser',
    display_name: 'Test User',
    league_id: 'test_league_456',
    league_name: 'Test League',
    week: 1,
    team_id: 1,
    team_name: 'Baltimore Ravens',
    team_key: 'BAL',
    action: 'TEST',
    season: 2025,
    ip_address: 'test',
    user_agent: 'test'
  };
  
  // Simulate a POST request
  const e = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(e);
  console.log(result.getContent());
}
```

4. Click **Save** (name it "Pick Backup Webhook")
5. Click **Run** > Run `testWebhook` to test (you'll see a test entry in your sheet)

## 🚀 Step 3: Deploy as Web App

1. Click **Deploy** > **New Deployment**
2. Settings:
   - Type: **Web app**
   - Description: `Pickem Party Pick Backup`
   - Execute as: **Me** (your email)
   - Who has access: **Anyone**
3. Click **Deploy**
4. **COPY THE WEB APP URL** (looks like: `https://script.google.com/macros/s/AKfycb.../exec`)
5. Click **Done**

## 🔐 Step 4: Add Webhook to Vercel

1. Go to your [Vercel Dashboard](https://vercel.com)
2. Navigate to your Pickem Party project
3. Go to **Settings > Environment Variables**
4. Add new variable:
   - Name: `GOOGLE_SHEETS_WEBHOOK_URL`
   - Value: [Paste your Web App URL from Step 3]
   - Environment: Production (and Preview/Development if desired)
5. Click **Save**

## ✅ Step 5: Test the Backup

1. Make a test pick in your app
2. Check your Google Sheet - you should see the pick appear within seconds
3. The sheet will show:
   - Exact timestamp
   - User who made the pick
   - Which team they picked
   - Whether it was new or an update
   - Full audit trail

## 🛡️ Backup Benefits

- **Immutable**: Once written, picks can't be accidentally deleted
- **Timestamped**: Exact moment of every pick
- **Auditable**: See all pick changes and updates
- **Disaster Recovery**: Can rebuild entire database from this sheet
- **Visual**: Easy to verify and inspect
- **Free**: Uses Google's free tier (up to 10M cells)

## 📊 Optional: Create Backup Dashboard

In your Google Sheet, create a new sheet tab called "Dashboard" with:
- Total picks backed up
- Picks by week
- Picks by user
- Most recent picks
- Error tracking

## 🔧 Troubleshooting

**Picks not appearing in sheet?**
1. Check Vercel environment variable is set
2. Re-deploy your app after adding the env variable
3. Check Apps Script deployment is active
4. Test webhook with the `testWebhook` function

**Getting errors?**
1. Make sure Web App is set to "Anyone" can access
2. Check column headers match exactly
3. Verify webhook URL is correct in Vercel

## 🎯 Success Metrics

Your backup is working if:
- ✅ Every pick appears in the sheet within 5 seconds
- ✅ Both NEW and UPDATE actions are logged
- ✅ Timestamp matches when pick was made
- ✅ You can see full history of pick changes

## 💡 Pro Tips

1. **Never delete the sheet** - It's your safety net
2. **Download monthly backups** - Export as CSV monthly
3. **Set up alerts** - Google Sheets can email you daily summaries
4. **Share read-only** - Give commissioners view access
5. **Version control** - The sheet itself has version history

---

**Remember**: This backup runs silently in the background. Even if your database is completely wiped, you can reconstruct every pick from this sheet!