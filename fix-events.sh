#!/bin/bash

# Script to fix KeyEvent structures in utils.test.ts

FILE="apps/ally-helpline-dashboard/src/containers/simulation-summary-state/components/__tests__/utils.test.ts"

# Fix events with only message and score
sed -i '' 's/events: { message: "Event with seconds", score: "5" }/events: { id: "2", name: "Event with seconds", description: "Event with seconds", score: "5", emoji: "⏱️", message: "Event with seconds" }/' "$FILE"

sed -i '' 's/events: { message: "Last event", score: 7 }/events: { id: "3", name: "Last event", description: "Last event", score: "7", emoji: "🏁", message: "Last event" }/' "$FILE"

sed -i '' 's/events: { message: "First event", score: 5 }/events: { id: "4", name: "First event", description: "First event", score: "5", emoji: "🎯", message: "First event" }/' "$FILE"

sed -i '' 's/events: { message: "Middle event", score: 8 }/events: { id: "5", name: "Middle event", description: "Middle event", score: "8", emoji: "💬", message: "Middle event" }/' "$FILE"

sed -i '' 's/events: { message: "Event without score", score: null }/events: { id: "6", name: "Event without score", description: "Event without score", score: null, emoji: "❓", message: "Event without score" }/' "$FILE"

sed -i '' 's/events: { message: null, score: "5" }/events: { id: "7", name: "Event without message", description: "Event without message", score: "5", emoji: "💭", message: null }/' "$FILE"

sed -i '' 's/events: { message: "Long session event", score: "5" }/events: { id: "8", name: "Long session event", description: "Long session event", score: "5", emoji: "⏰", message: "Long session event" }/' "$FILE"

echo "Done fixing KeyEvent structures"
