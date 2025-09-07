# Keyword-Based Tagging System

This module implements automatic organization through keyword-based tagging for the Backtrack app.

## Overview

The keyword-based tagger automatically categorizes items based on their content, making it easy to organize and find items later. It's designed to be easily replaceable with semantic embeddings + AI in the future.

## Features

### Automatic Tagging
- **URL-based tagging**: Derives tags from domain, title, and known platform types
- **OCR-based tagging**: Derives tags from OCR text extracted from screenshots
- **Content-based tagging**: Analyzes titles, descriptions, and content for relevant keywords

### Manual Tag Editing
- **Tag Editor Component**: Full-featured modal for adding/removing tags from items
- **Item Detail Integration**: Tags are displayed in ItemDetail with edit capability
- **Tag Management**: Create new tags, assign existing tags, remove tags

### Search Integration
- **Tag-based filtering**: Search results can be filtered by tags
- **Tag display**: Search results show associated tags
- **Filter options**: Available tags are loaded for the search filter UI

## Implementation

### Core Components

#### `KeywordTagger` Class
- **Location**: `src/features/tags/keywordTagger.ts`
- **Purpose**: Main tagging engine that maps keywords to tags
- **Features**:
  - Configurable keyword mappings
  - Content extraction from items
  - Tag extraction and assignment
  - Batch processing support

#### `TagEditor` Component
- **Location**: `src/components/TagEditor.tsx`
- **Purpose**: UI component for manual tag editing
- **Features**:
  - Add/remove tags from items
  - Create new tags
  - Display current and available tags
  - Modal interface

#### Integration Points
- **Photo Scanning**: `src/features/ingest/photosScan.ts`
- **URL Ingestion**: `src/features/ingest/urlIngest.ts`
- **OCR Processing**: `src/features/ingest/ocr.ts`
- **Item Display**: `src/components/ItemDetail.tsx`

### Keyword Mappings

The system includes comprehensive keyword mappings for:

#### Platform-based Tags
- `spotify` → `Music`
- `youtube`, `youtu.be` → `Video`
- `instagram`, `twitter`, `facebook` → `Social`
- `github`, `stackoverflow` → `Development`
- `linkedin` → `Professional`

#### Content-based Tags
- `recipe`, `cooking`, `food` → `Food`
- `workout`, `exercise`, `gym` → `Fitness`
- `travel`, `vacation`, `hotel` → `Travel`
- `shopping`, `buy`, `amazon` → `Shopping`
- `news`, `article` → `News`
- `tutorial`, `course`, `learn` → `Learning`
- `code`, `programming` → `Development`
- `design`, `ui`, `ux` → `Design`
- `finance`, `money`, `investment` → `Finance`
- `health`, `medical` → `Health`
- `entertainment`, `movie`, `tv` → `Entertainment`
- `business`, `startup` → `Business`
- `home`, `decor`, `diy` → `Home`
- `family`, `kids` → `Personal`
- `car`, `vehicle` → `Automotive`
- `pet`, `dog`, `cat` → `Pets`

## Usage

### Automatic Tagging

Tags are automatically applied during item ingestion:

```typescript
import { keywordTagger } from '../tags';

// Tag a single item
const result = await keywordTagger.tagItem(item);

// Tag multiple items
const result = await keywordTagger.tagItems(items);
```

### Manual Tag Editing

Users can manually edit tags through the ItemDetail component:

1. Open an item in ItemDetail
2. Click the edit button (✏️) next to the Tags section
3. Use the TagEditor modal to:
   - Add existing tags
   - Create new tags
   - Remove tags

### Search by Tags

Users can filter search results by tags:

1. Open the search screen
2. Tap the filter button
3. Select tags from the "Tags" section
4. Search results will be filtered to only show items with selected tags

## Testing

### Unit Tests
- **Location**: `src/features/tags/keywordTagger.test.ts`
- **Coverage**: Keyword extraction, tag mapping, custom mappings

### Integration Tests
- **Location**: `src/features/tags/integration.test.ts`
- **Coverage**: End-to-end tagging flow, search integration

### Manual Testing
Run the manual test function to verify functionality:

```typescript
import { runManualTests } from './integration.test';
await runManualTests();
```

## Verification

### YouTube URL Auto-tagging
✅ **Verified**: YouTube URLs are automatically tagged as "Video"
- Test URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- Expected tag: `Video`
- Status: Working

### Tag-based Search Filtering
✅ **Verified**: Search system supports tag-based filtering
- Tag filtering logic implemented in `SearchService.search()`
- Filter options include available tags
- Search results display tag information
- Status: Working

## Future Enhancements

### Semantic Embeddings + AI
The current keyword-based system is designed to be easily replaceable with more sophisticated AI-based tagging:

1. **Replace KeywordTagger**: Swap out keyword matching with AI model
2. **Keep same interface**: Maintain `tagItem()` and `tagItems()` methods
3. **Enhanced accuracy**: Use semantic understanding instead of keyword matching
4. **Custom categories**: Allow users to define custom tag categories

### Additional Features
- **Tag suggestions**: AI-powered tag recommendations
- **Tag analytics**: Usage statistics and insights
- **Bulk tag operations**: Mass tag assignment/removal
- **Tag hierarchies**: Parent-child tag relationships
- **Tag colors**: Visual organization with color coding

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Item Ingest   │───▶│  KeywordTagger   │───▶│   Database      │
│                 │    │                  │    │                 │
│ • photosScan    │    │ • Extract tags   │    │ • Store tags    │
│ • urlIngest     │    │ • Map keywords   │    │ • Link items    │
│ • OCR process   │    │ • Assign tags    │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Search UI     │◀───│   SearchService  │◀───│   TagEditor     │
│                 │    │                  │    │                 │
│ • Filter by tag │    │ • Filter by tags │    │ • Manual edit   │
│ • Display tags  │    │ • Include tags   │    │ • Add/remove    │
│                 │    │ • Sort results   │    │ • Create tags   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

This architecture ensures that the tagging system is:
- **Modular**: Easy to replace individual components
- **Extensible**: Simple to add new features
- **Maintainable**: Clear separation of concerns
- **Testable**: Each component can be tested independently
