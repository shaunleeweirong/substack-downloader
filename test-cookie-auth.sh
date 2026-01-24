#!/bin/bash

# Test cookie authentication for Lenny's Newsletter
# Custom domain: www.lennysnewsletter.com (uses connect.sid)
# Substack domain: lenny.substack.com (uses substack.sid)

COOKIE_VALUE="s%3AvM07RCOqGcJyY0W_ZqG_fOfgm8srF3JJ.2nB7BmZKyEP7zBOJ1xlfce%2FV7Vjbp%2B%2F8CYDz7a5tH4M"
PAID_POST_SLUG="ai-tools-are-overdelivering-results"

echo "=========================================="
echo "Cookie Authentication Test"
echo "=========================================="
echo ""

# Test 1: Custom domain with connect.sid
echo "=== TEST 1: Custom Domain (connect.sid) ==="
CUSTOM_DOMAIN="https://www.lennysnewsletter.com"
CUSTOM_COOKIE="connect.sid=$COOKIE_VALUE"

echo "Domain: $CUSTOM_DOMAIN"
echo "Cookie: connect.sid=..."
echo ""

# Fetch API without auth
echo "1a. Fetching post API WITHOUT cookie..."
API_NO_AUTH=$(curl -s -w "\n%{http_code}" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: application/json" \
  "$CUSTOM_DOMAIN/api/v1/posts/$PAID_POST_SLUG")

API_NO_AUTH_STATUS=$(echo "$API_NO_AUTH" | tail -1)
API_NO_AUTH_BODY=$(echo "$API_NO_AUTH" | sed '$d')
API_NO_AUTH_LEN=${#API_NO_AUTH_BODY}

echo "   Status: $API_NO_AUTH_STATUS"
echo "   Response length: $API_NO_AUTH_LEN chars"

# Check for body_html in response
if echo "$API_NO_AUTH_BODY" | grep -q '"body_html"'; then
  BODY_HTML_LEN=$(echo "$API_NO_AUTH_BODY" | grep -o '"body_html":"[^"]*"' | head -1 | wc -c)
  echo "   Has body_html: YES (~$BODY_HTML_LEN chars in field)"
else
  echo "   Has body_html: NO"
fi

echo ""
echo "1b. Fetching post API WITH cookie..."
API_WITH_AUTH=$(curl -s -w "\n%{http_code}" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: application/json" \
  -H "Cookie: $CUSTOM_COOKIE" \
  "$CUSTOM_DOMAIN/api/v1/posts/$PAID_POST_SLUG")

API_WITH_AUTH_STATUS=$(echo "$API_WITH_AUTH" | tail -1)
API_WITH_AUTH_BODY=$(echo "$API_WITH_AUTH" | sed '$d')
API_WITH_AUTH_LEN=${#API_WITH_AUTH_BODY}

echo "   Status: $API_WITH_AUTH_STATUS"
echo "   Response length: $API_WITH_AUTH_LEN chars"

if echo "$API_WITH_AUTH_BODY" | grep -q '"body_html"'; then
  BODY_HTML_LEN=$(echo "$API_WITH_AUTH_BODY" | grep -o '"body_html":"[^"]*"' | head -1 | wc -c)
  echo "   Has body_html: YES (~$BODY_HTML_LEN chars in field)"
else
  echo "   Has body_html: NO"
fi

# Compare
echo ""
if [ "$API_NO_AUTH_LEN" -eq "$API_WITH_AUTH_LEN" ]; then
  echo "   Result: IDENTICAL responses - cookie NOT working"
else
  DIFF=$((API_WITH_AUTH_LEN - API_NO_AUTH_LEN))
  echo "   Result: Responses differ by $DIFF chars"
  if [ "$API_WITH_AUTH_LEN" -gt "$API_NO_AUTH_LEN" ]; then
    echo "   Cookie appears to be WORKING (larger response with auth)"
  fi
fi

echo ""
echo ""

# Test 2: Substack domain with substack.sid
echo "=== TEST 2: Substack Domain (substack.sid) ==="
SUBSTACK_DOMAIN="https://lenny.substack.com"
SUBSTACK_COOKIE="substack.sid=$COOKIE_VALUE"

echo "Domain: $SUBSTACK_DOMAIN"
echo "Cookie: substack.sid=..."
echo ""

# Fetch API without auth
echo "2a. Fetching post API WITHOUT cookie..."
API_NO_AUTH=$(curl -s -w "\n%{http_code}" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: application/json" \
  "$SUBSTACK_DOMAIN/api/v1/posts/$PAID_POST_SLUG")

API_NO_AUTH_STATUS=$(echo "$API_NO_AUTH" | tail -1)
API_NO_AUTH_BODY=$(echo "$API_NO_AUTH" | sed '$d')
API_NO_AUTH_LEN=${#API_NO_AUTH_BODY}

echo "   Status: $API_NO_AUTH_STATUS"
echo "   Response length: $API_NO_AUTH_LEN chars"

if echo "$API_NO_AUTH_BODY" | grep -q '"body_html"'; then
  echo "   Has body_html: YES"
else
  echo "   Has body_html: NO"
fi

echo ""
echo "2b. Fetching post API WITH cookie..."
API_WITH_AUTH=$(curl -s -w "\n%{http_code}" \
  -H "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" \
  -H "Accept: application/json" \
  -H "Cookie: $SUBSTACK_COOKIE" \
  "$SUBSTACK_DOMAIN/api/v1/posts/$PAID_POST_SLUG")

API_WITH_AUTH_STATUS=$(echo "$API_WITH_AUTH" | tail -1)
API_WITH_AUTH_BODY=$(echo "$API_WITH_AUTH" | sed '$d')
API_WITH_AUTH_LEN=${#API_WITH_AUTH_BODY}

echo "   Status: $API_WITH_AUTH_STATUS"
echo "   Response length: $API_WITH_AUTH_LEN chars"

if echo "$API_WITH_AUTH_BODY" | grep -q '"body_html"'; then
  echo "   Has body_html: YES"
else
  echo "   Has body_html: NO"
fi

# Compare
echo ""
if [ "$API_NO_AUTH_LEN" -eq "$API_WITH_AUTH_LEN" ]; then
  echo "   Result: IDENTICAL responses - cookie NOT working"
else
  DIFF=$((API_WITH_AUTH_LEN - API_NO_AUTH_LEN))
  echo "   Result: Responses differ by $DIFF chars"
  if [ "$API_WITH_AUTH_LEN" -gt "$API_NO_AUTH_LEN" ]; then
    echo "   Cookie appears to be WORKING (larger response with auth)"
  fi
fi

echo ""
echo ""
echo "=========================================="
echo "Summary"
echo "=========================================="
echo "If responses are identical, the cookie is NOT being recognized."
echo "Possible reasons:"
echo "  1. Cookie is expired"
echo "  2. Cookie is URL-encoded and needs decoding"
echo "  3. Wrong cookie name for the domain"
echo "  4. Additional cookies may be required"
