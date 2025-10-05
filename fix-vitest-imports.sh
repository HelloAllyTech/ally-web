#!/bin/bash

# Script to fix missing vitest imports in test files

# Find all test files that use vitest functions but don't import them
find apps/ally-helpline-dashboard/src -name "*.test.tsx" -exec grep -l "describe\|it\|expect\|beforeEach\|vi\." {} \; | while read file; do
  # Check if the file already imports from vitest
  if ! grep -q "from \"vitest\"" "$file"; then
    echo "Fixing imports in: $file"
    
    # Add vitest imports after the first import statement
    sed -i '' '/^import.*from.*$/a\
import { vi, describe, it, expect, beforeEach } from "vitest";
' "$file"
  fi
done

echo "Done fixing vitest imports"
