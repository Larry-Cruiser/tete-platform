#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Starting deployment...${NC}"

# Add all changes
git add .

# Show what's being committed
echo -e "${YELLOW}Changes to be committed:${NC}"
git status --short

# Commit with timestamp
COMMIT_MSG="Update: $(date '+%Y-%m-%d %H:%M:%S')"
git commit -m "$COMMIT_MSG"

# Push to GitHub
echo -e "${YELLOW}Pushing to GitHub...${NC}"
git push origin main

# Deploy to Vercel
echo -e "${YELLOW}Deploying to Vercel...${NC}"
vercel --prod

echo -e "${GREEN}✓ Deployment complete!${NC}"