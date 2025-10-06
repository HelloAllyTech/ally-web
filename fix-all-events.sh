#!/bin/bash

# Script to fix all remaining KeyEvent structures in utils.test.ts

FILE="apps/ally-helpline-dashboard/src/containers/simulation-summary-state/components/__tests__/utils.test.ts"

# Find all events that still need fixing
echo "Fixing remaining events..."

# Fix events with only message and score (pattern: events: { message: "...", score: "..." })
sed -i '' 's/events: { message: "Long session event", score: "5" }/events: { id: "8", name: "Long session event", description: "Long session event", score: "5", emoji: "⏰", message: "Long session event" }/' "$FILE"

# Fix any remaining events with just message and score
sed -i '' 's/events: { message: "\([^"]*\)", score: "\([^"]*\)" }/events: { id: "9", name: "\1", description: "\1", score: "\2", emoji: "🎯", message: "\1" }/' "$FILE"

# Fix events with message and number score
sed -i '' 's/events: { message: "\([^"]*\)", score: \([0-9]*\) }/events: { id: "10", name: "\1", description: "\1", score: "\2", emoji: "🎯", message: "\1" }/' "$FILE"

echo "Done fixing all remaining events"
