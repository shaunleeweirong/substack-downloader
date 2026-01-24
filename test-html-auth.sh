#!/bin/bash

# Test if HTML page (not API) returns different content with vs without cookies
COOKIE="substack.sid=s%3AOGx8j8v8fGplisiR1QN4fjWJ0AVRXKfd.YwBnud0E8BCNsYKxTDS02rfLFDJJfuHWkU0q1PZubc8"
POST_URL="https://lenny.substack.com/p/how-duolingo-reignited-user-growth"

echo "=== Testing HTML Page (not API) ==="
echo ""

# Fetch WITHOUT cookie
echo "1. Fetching HTML WITHOUT cookie..."
HTML_NO_AUTH=$(curl -s -L \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: text/html" \
  "$POST_URL" 2>/dev/null)

NO_AUTH_LEN=${#HTML_NO_AUTH}
echo "   HTML length without cookie: $NO_AUTH_LEN characters"

# Check for paywall content in unauthenticated
NO_AUTH_PAYWALL=$(echo "$HTML_NO_AUTH" | grep -c "paywall" || echo "0")
NO_AUTH_SUBSCRIBE=$(echo "$HTML_NO_AUTH" | grep -c "subscribe" || echo "0")
echo "   Paywall mentions: $NO_AUTH_PAYWALL"
echo "   Subscribe mentions: $NO_AUTH_SUBSCRIBE"

echo ""
echo "2. Fetching HTML WITH cookie..."
HTML_WITH_AUTH=$(curl -s -L \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: text/html" \
  -H "Cookie: $COOKIE" \
  "$POST_URL" 2>/dev/null)

WITH_AUTH_LEN=${#HTML_WITH_AUTH}
echo "   HTML length with cookie: $WITH_AUTH_LEN characters"

# Check for paywall content in authenticated
WITH_AUTH_PAYWALL=$(echo "$HTML_WITH_AUTH" | grep -c "paywall" || echo "0")
WITH_AUTH_SUBSCRIBE=$(echo "$HTML_WITH_AUTH" | grep -c "subscribe" || echo "0")
echo "   Paywall mentions: $WITH_AUTH_PAYWALL"
echo "   Subscribe mentions: $WITH_AUTH_SUBSCRIBE"

echo ""
echo "=== Comparison ==="
if [ "$NO_AUTH_LEN" -eq "$WITH_AUTH_LEN" ]; then
  echo "❌ HTML lengths are IDENTICAL - cookie has NO effect on HTML page"
else
  DIFF=$((WITH_AUTH_LEN - NO_AUTH_LEN))
  echo "✓ HTML lengths differ by $DIFF characters"
  if [ "$WITH_AUTH_LEN" -gt "$NO_AUTH_LEN" ]; then
    echo "✓ Authenticated response is LARGER (good sign!)"
  else
    echo "⚠ Authenticated response is SMALLER"
  fi
fi

# Count body.markup content specifically
echo ""
echo "=== Checking article body content ==="
# Extract content between <div class="body markup" and next </div>
NO_AUTH_BODY=$(echo "$HTML_NO_AUTH" | grep -o '<div class="body markup[^"]*"[^>]*>.*' | head -1 | wc -c)
WITH_AUTH_BODY=$(echo "$HTML_WITH_AUTH" | grep -o '<div class="body markup[^"]*"[^>]*>.*' | head -1 | wc -c)
echo "Body content length without auth: ~$NO_AUTH_BODY"
echo "Body content length with auth: ~$WITH_AUTH_BODY"

# Check for "Continue reading" or paywall-specific text
echo ""
echo "=== Checking for paywall indicators ==="
echo "Without auth - 'Continue reading': $(echo "$HTML_NO_AUTH" | grep -c 'Continue reading' || echo 0)"
echo "With auth - 'Continue reading': $(echo "$HTML_WITH_AUTH" | grep -c 'Continue reading' || echo 0)"
echo "Without auth - 'This post is for paid': $(echo "$HTML_NO_AUTH" | grep -c 'This post is for paid' || echo 0)"
echo "With auth - 'This post is for paid': $(echo "$HTML_WITH_AUTH" | grep -c 'This post is for paid' || echo 0)"

