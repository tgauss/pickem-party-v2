#!/bin/bash

# Quick test for auto-settlement
CRON_SECRET="A3P9U806Q5s55s8fywxL//EmiuCSkMuUkuz+4KGix4A="
APP_URL="https://www.pickemparty.app"

echo "🧪 Testing Auto-Settlement API..."
echo ""

# Test 1: Check status endpoint
echo "1️⃣ Checking API status..."
STATUS=$(curl -s -X GET \
  -H "x-cron-secret: $CRON_SECRET" \
  "$APP_URL/api/admin/auto-settle-week")

echo "$STATUS" | jq '.'
echo ""

# Test 2: Dry run for Week 11
echo "2️⃣ Testing Week 11 settlement (DRY RUN - no changes)..."
RESULT=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d '{"week": 11, "dryRun": true}' \
  "$APP_URL/api/admin/auto-settle-week")

echo "$RESULT" | jq '.'
