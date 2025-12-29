# Notion Integration Implementation Guide

## Overview

The M1 Notion integration allows kondate_maker to read recipes and meal logs from Notion databases, applying recency suppression and high-rating priority when generating meal plans.

## Architecture

```
Main.tsx
   └─> candidatePool.loadCandidatePool()
          ├─> notionIntegration.loadNotionRecipes() [if configured]
          │      ├─> notionClient.fetchRecipes()
          │      ├─> notionClient.fetchMealLogs()
          │      ├─> notionMapper.mapToRecipes()
          │      ├─> notionMapper.mapToMealLogs()
          │      └─> recipeScoring.selectTopRecipes()
          │             ├─> scoreRecipes() - applies rating + recency
          │             └─> relaxation if insufficient candidates
          └─> JSON pool fallback (if Notion fails)
```

## Module Descriptions

### 1. notionTypes.ts
Defines internal domain models:
- `NotionRecipe`: Normalized recipe from Notion
- `NotionMealLog`: Normalized meal log from Notion
- `ScoredRecipe`: Recipe with calculated score

### 2. notionClient.ts
Low-level Notion API wrapper:
- `createNotionClient()`: Creates authenticated client
- `queryDataSource()`: Generic query with pagination
- `fetchRecipes()`: Query Recipes data source (Active=true, sorted by Rating)
- `fetchMealLogs()`: Query recent Meal Logs (past N days)

### 3. notionMapper.ts
Transforms Notion API responses to internal types:
- `mapToRecipe()`: Notion page → NotionRecipe
- `mapToMealLog()`: Notion page → NotionMealLog
- Validates required fields, filters invalid entries

### 4. recipeScoring.ts
Implements scoring algorithm:
- `scoreRecipe()`: Calculate score = (Rating × 10) - (Recency Penalty if recent)
- `scoreRecipes()`: Batch scoring with meal log history
- `selectTopRecipes()`: Select top N, with relaxation if needed
- Relaxation steps: 14 days → 7 days → 0 days (no suppression)

### 5. notionIntegration.ts
High-level API:
- `loadNotionRecipes()`: End-to-end flow to get scored recipes
- `checkNotionAvailability()`: Test Notion connection
- Converts NotionRecipe → CandidateRecipe format

### 6. candidatePool.ts (extended)
Unified pool loading with source priority:
1. Try Notion (if configured)
2. Fall back to JSON pool
3. Fall back to cache
4. Fall back to embedded fallback recipes

## Configuration

Set these environment variables:

```bash
# Required for Notion integration
VITE_NOTION_TOKEN=secret_xxx...
VITE_NOTION_RECIPES_DATA_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_NOTION_MEAL_LOGS_DATA_SOURCE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

If not set, the app falls back to the existing JSON pool mechanism.

## Scoring Algorithm

### Base Score
```
score = rating × 10
```
- Rating 5 → 50 points
- Rating 4 → 40 points
- Rating 3 (default) → 30 points
- Rating 2 → 20 points
- Rating 1 → 10 points

### Recency Penalty
```
if (lastUsedDaysAgo <= recencyWindow):
    score -= 30
```
- Recipes used within the recency window (default 14 days) lose 30 points
- Example: Rating 5 recipe used 3 days ago → 50 - 30 = 20 points
- Example: Rating 5 recipe never used → 50 points

### Relaxation Strategy
If insufficient candidates after scoring:
1. **Level 1**: Reduce recency window to 7 days
2. **Level 2**: Remove recency suppression (window = 0)
3. **Final**: If still insufficient, warn user

## Testing

### Unit Tests
- `notionMapper.test.ts`: 10 tests for data normalization
- `recipeScoring.test.ts`: 11 tests for scoring logic

### Running Tests
```bash
npm test                     # All tests (67 total)
npm run test:notion-mapper   # Mapper tests only
npm run test:recipe-scoring  # Scoring tests only
```

## Error Handling

### Graceful Degradation
1. **No Notion config**: Silently use JSON pool
2. **Notion API error**: Log error, fall back to JSON pool
3. **No recipes found**: Warn user, fall back to JSON pool
4. **Insufficient candidates**: Relax recency, warn user

### Error Messages
Errors are logged to console and displayed to user:
- "Notion integration is not configured"
- "Failed to load recipes from Notion: [details]"
- "候補が不足しています（必要: X件、取得: Y件）"
- "候補不足のため、直近抑制を解除しました。"

## Future Enhancements (Out of Scope for M1)

- Write back to Notion (create/update Meal Logs)
- Category balancing (主菜/副菜/汁物)
- Day-of-week preferences
- Nutritional optimization
- Automatic rating updates from RatingAfter

## Troubleshooting

### "404 Could not find data source"
- Integration is not connected to the database
- Go to Notion → Database → "..." → "Add connections" → Select integration

### "401 Unauthorized"
- Invalid or missing VITE_NOTION_TOKEN
- Check environment variables, regenerate token if needed

### "No recipes found"
- All recipes have Active = false
- Check Recipe database, ensure some have Active checkbox checked
- Or add more recipes

### Tests fail
```bash
# Clean install and rebuild
rm -rf node_modules package-lock.json
npm install
npm test
npm run lint
npm run build
```

## Code Comments

Key implementation notes are inline:
- Type assertions in `notionClient.ts` are necessary due to SDK type limitations for data source API
- Default rating is 3 (defined in `notionMapper.ts` and `recipeScoring.ts`)
- Recency window default is 14 days (exported from `recipeScoring.ts`)
- Batch operations use Promise.all for parallel fetching

## Related Documentation

- [docs/notion/SETUP.md](./SETUP.md) - User-facing setup guide
- [docs/notion/SCHEMA.md](./SCHEMA.md) - Data model definitions
- [README.md](../../README.md) - Main project README
