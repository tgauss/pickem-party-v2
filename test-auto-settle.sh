#!/bin/bash

# Test script for auto-settlement API
# Usage: ./test-auto-settle.sh [week] [--dry-run]

# Configuration
APP_URL="${APP_URL:-https://www.pickemparty.app}"
CRON_SECRET="${CRON_SECRET:-pickem-party-cron-2025}"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
WEEK=""
DRY_RUN="false"

while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN="true"
      shift
      ;;
    *)
      WEEK="$1"
      shift
      ;;
  esac
done

# Build request body
BODY="{"
if [ -n "$WEEK" ]; then
  BODY="${BODY}\"week\": $WEEK,"
fi
BODY="${BODY}\"dryRun\": $DRY_RUN}"

echo -e "${YELLOW}Testing Auto-Settlement API${NC}"
echo "URL: $APP_URL/api/admin/auto-settle-week"
echo "Body: $BODY"
echo ""

# Make request
RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: $CRON_SECRET" \
  -d "$BODY" \
  "$APP_URL/api/admin/auto-settle-week")

# Check if response is valid JSON
if ! echo "$RESPONSE" | jq empty 2>/dev/null; then
  echo -e "${RED}Error: Invalid JSON response${NC}"
  echo "$RESPONSE"
  exit 1
fi

# Parse response
SUCCESS=$(echo "$RESPONSE" | jq -r '.success')
MESSAGE=$(echo "$RESPONSE" | jq -r '.message')
WEEK_NUM=$(echo "$RESPONSE" | jq -r '.week')
GAMES=$(echo "$RESPONSE" | jq -r '.gamesProcessed')
PICKS=$(echo "$RESPONSE" | jq -r '.picksProcessed')
DEDUCTIONS=$(echo "$RESPONSE" | jq -r '.lifeDeductions')
ELIMS=$(echo "$RESPONSE" | jq -r '.eliminations | length')

# Display results
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "$SUCCESS" = "true" ]; then
  echo -e "${GREEN}✓ SUCCESS${NC}"
  echo ""
  echo "Week: $WEEK_NUM"
  echo "Games Processed: $GAMES"
  echo "Picks Processed: $PICKS"
  echo "Life Deductions: $DEDUCTIONS"
  echo "Eliminations: $ELIMS"
  echo ""
  echo "Message: $MESSAGE"

  # Show eliminations if any
  if [ "$ELIMS" -gt 0 ]; then
    echo ""
    echo "Eliminated Players:"
    echo "$RESPONSE" | jq -r '.eliminations[]' | while read player; do
      echo "  - $player"
    done
  fi

  # Show errors if any
  ERRORS=$(echo "$RESPONSE" | jq -r '.errors | length')
  if [ "$ERRORS" -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Warnings/Errors:${NC}"
    echo "$RESPONSE" | jq -r '.errors[]' | while read error; do
      echo "  - $error"
    done
  fi

  echo ""
  echo -e "${GREEN}Full Response:${NC}"
  echo "$RESPONSE" | jq '.'

else
  echo -e "${RED}✗ FAILED${NC}"
  echo ""
  echo "Message: $MESSAGE"
  echo ""

  # Show errors
  ERRORS=$(echo "$RESPONSE" | jq -r '.errors | length')
  if [ "$ERRORS" -gt 0 ]; then
    echo "Errors:"
    echo "$RESPONSE" | jq -r '.errors[]' | while read error; do
      echo "  - $error"
    done
  fi

  echo ""
  echo -e "${RED}Full Response:${NC}"
  echo "$RESPONSE" | jq '.'

  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
