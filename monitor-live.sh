#!/bin/bash

# Live monitoring script for Week 11 settlement
# Checks game status every 5 minutes until 10pm PST

TARGET_HOUR=22  # 10pm in 24-hour format
CURRENT_HOUR=$(date +%H)
SECRET='A3P9U806Q5s55s8fywxL//EmiuCSkMuUkuz+4KGix4A='

echo "🎮 PICKEM PARTY - Live Settlement Monitor"
echo "=========================================="
echo ""

while true; do
    CURRENT_TIME=$(date +"%I:%M %p %Z")
    CURRENT_HOUR=$(date +%H)

    echo "⏰ Time: $CURRENT_TIME"
    echo ""

    # Check game status
    echo "🏈 Checking Week 11 game status..."
    RESPONSE=$(curl -s -X POST 'https://www.pickemparty.app/api/admin/auto-settle-week' \
      -H 'Content-Type: application/json' \
      -H "x-cron-secret: $SECRET" \
      -d '{"week": 11, "dryRun": true}')

    SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
    MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
    GAMES_LEFT=$(echo "$RESPONSE" | jq -r '.errors | length')

    if [ "$SUCCESS" = "true" ]; then
        echo "✅ ALL GAMES FINAL! Ready to process!"
        echo ""
        echo "$RESPONSE" | jq '.'
        echo ""
        echo "🎯 Settlement can proceed!"
        break
    else
        echo "⏳ Status: $MESSAGE"
        if [ "$GAMES_LEFT" -gt 0 ]; then
            echo "   Games not final: $(echo "$RESPONSE" | jq -r '.errors[]')"
        fi
    fi

    echo ""
    echo "=========================================="

    # Check if we've passed 10pm
    if [ "$CURRENT_HOUR" -ge "$TARGET_HOUR" ]; then
        echo ""
        echo "🕐 It's past 10pm PST!"
        echo "🤖 Vercel cron should have triggered by now"
        echo ""
        echo "📋 Check Vercel logs at:"
        echo "   https://vercel.com → pickem-party-v2 → Functions → Logs"
        echo ""

        if [ "$SUCCESS" != "true" ]; then
            echo "⚠️  Game still not final - cron run will wait"
            echo "💡 You can manually trigger settlement after game ends:"
            echo "   curl -X POST https://www.pickemparty.app/api/admin/auto-settle-week \\"
            echo "     -H 'Content-Type: application/json' \\"
            echo "     -H 'x-cron-secret: $SECRET' \\"
            echo "     -d '{\"week\": 11}'"
        fi

        break
    fi

    # Wait 5 minutes before next check (unless close to 10pm)
    MINUTES_TO_10PM=$(( ($TARGET_HOUR - $CURRENT_HOUR) * 60 ))

    if [ "$MINUTES_TO_10PM" -le 5 ]; then
        echo "⏰ Less than 5 minutes to 10pm - checking again in 1 minute..."
        sleep 60
    else
        echo "💤 Next check in 5 minutes..."
        sleep 300
    fi

    echo ""
done

echo ""
echo "🏁 Monitoring complete!"
