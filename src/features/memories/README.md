# Memories Feature

This feature implements a comprehensive memories system that resurfaces items based on their original source date, not ingestion date.

## Features

- **Yearly "On This Day"**: Shows items from the same month/day in prior years (±7d window)
- **Monthly Intervals**: Shows items from 2, 4, 6, 8, 10 months ago (±3d window)
- **Smart Date Handling**: Handles month-end gracefully (e.g., Feb 30 → Feb 28/29)
- **Configurable Settings**: Customizable windows, quiet hours, privacy settings
- **Memory Actions**: Snooze, dismiss, "show fewer like this", add to folder, share

## Files

- `selectMemories.ts` - Core logic for window computation and memory selection
- `settings.ts` - Settings management with AsyncStorage persistence
- `memoriesHooks.ts` - React hooks for using memories in components
- `memoriesTest.ts` - Test utilities for verification
- `index.ts` - Feature exports

## Usage

### Basic Usage

```typescript
import { useMemories } from '../features/memories';

function MyComponent() {
  const { memories, groupedMemories, loading, refreshMemories } = useMemories();
  
  // Use memories data...
}
```

### Manual Memory Selection

```typescript
import { getMemoriesWindows, selectMemories, loadMemoriesSettings } from '../features/memories';

const settings = await loadMemoriesSettings();
const windows = getMemoriesWindows(new Date(), settings);
const memories = await selectMemories(windows, settings);
```

### Testing

```typescript
import { runMemoriesTest } from '../features/memories';

// Run comprehensive test with sample data
await runMemoriesTest();
```

## Settings

The memories system supports the following settings:

- `cadence`: "daily" | "weekly" - How often to show memories
- `quietHours`: { start: number, end: number } - Hours to avoid showing memories
- `includePrivate`: boolean - Whether to include private items
- `includeIntervals`: { yearly: boolean, months_2_4_6_8_10: boolean } - Which patterns to use
- `windowDays`: { yearly: number, monthly: number } - Window size in days
- `allowFallback`: boolean - Use ingested_at if source_date is missing

## Database Requirements

- Items table must have `source_date` column (already exists)
- Index on `source_date` for fast range queries (already exists)
- Items without `source_date` are excluded unless `allowFallback` is true

## Memory Patterns

### Yearly Pattern
- For each prior year Y where Y < current year
- Window: [today-7d, today+7d] but with year replaced by Y
- Example: If today is March 15, 2024, shows items from March 8-22, 2023, 2022, etc.

### Monthly Pattern
- For M ∈ {2,4,6,8,10}, window = [today shifted by -M months] ±3d
- Handles month-end gracefully (e.g., Jan 31 → Feb 28/29)
- Example: If today is March 15, 2024, shows items from Dec 12-18, 2023 (3 months ago)

## Verification

The test suite verifies:
- Screenshot taken exactly 6 months ago → appears under "6 months ago"
- Instagram saved on this date 3 years ago → appears under "On This Day (3y)"
- Edge bookmark saved ~+2 days around target date → appears due to ±3d monthly window
- Items without source_date are excluded (unless fallback enabled)
