#!/bin/bash

# Manual settlement trigger for Week 11
# Use this if you need to manually settle after the game ends

echo "🎯 MANUAL WEEK 11 SETTLEMENT"
echo "=========================================="
echo ""
echo "⚠️  This will ACTUALLY PROCESS Week 11 picks!"
echo "    (Not a dry run)"
echo ""
read -p "Are you sure you want to settle Week 11? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "❌ Cancelled"
    exit 0
fi

echo ""
echo "🚀 Triggering Week 11 settlement..."
echo ""

RESPONSE=$(curl -s -X POST 'https://www.pickemparty.app/api/admin/auto-settle-week' \
  -H 'Content-Type: application/json' \
  -H 'x-cron-secret: A3P9U806Q5s55s8fywxL//EmiuCSkMuUkuz+4KGix4A=' \
  -d '{"week": 11}')

echo "$RESPONSE" | jq '.'

SUCCESS=$(echo "$RESPONSE" | jq -r '.success')

echo ""
echo "=========================================="
echo ""

if [ "$SUCCESS" = "true" ]; then
    PICKS=$(echo "$RESPONSE" | jq -r '.picksProcessed')
    DEDUCTIONS=$(echo "$RESPONSE" | jq -r '.lifeDeductions')
    ELIMS=$(echo "$RESPONSE" | jq -r '.eliminations | length')

    echo "✅ SETTLEMENT COMPLETE!"
    echo ""
    echo "📊 Summary:"
    echo "   Picks processed: $PICKS"
    echo "   Life deductions: $DEDUCTIONS"
    echo "   Eliminations: $ELIMS"

    if [ "$ELIMS" -gt 0 ]; then
        echo ""
        echo "💀 Eliminated players:"
        echo "$RESPONSE" | jq -r '.eliminations[]' | while read player; do
            echo "   - $player"
        done
    fi
else
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    echo "❌ Settlement failed or not ready"
    echo "   Reason: $MESSAGE"
fi

echo ""
