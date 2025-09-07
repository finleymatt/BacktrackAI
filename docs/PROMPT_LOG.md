0) Project snapshot & guardrails

Prompt to Cursor

You are my senior React Native + Expo tech lead. Work in small, verifiable steps.

CONTEXT
- Expo app already runs in Expo Go and shows a Home screen.
- Goal: compliant Instagram-content organizer with Photos scan + OCR, AI tagging, search, folders, social (public folders), and a "Memories / On This Day" reminder feature.
- Must be compliant: no scraping, no private saved-bookmarks API. Ingestion via Share Sheet URL, user-shared links, and Photos library screenshots.

TASK
Create a short PROJECT_OVERVIEW.md that lists: target stack (Expo + EAS Build + optional Dev Client), key packages (expo-notifications, expo-media-library, expo-task-manager, expo-background-fetch, react-navigation, supabase-js, react-native-mmkv OR expo-sqlite), and a feature checklist with toggles.

DELIVERABLES
- /docs/PROJECT_OVERVIEW.md
- Update README with "Run", "Format", "Test" commands.
- Add basic Prettier + ESLint configs.

CONSTRAINTS
- Keep Expo Go working for now; call out which steps will require a custom dev client later (OCR, Share Extension, Background tasks).

FILES
- README.md, package.json, .eslintrc.cjs, .prettierrc, docs/PROJECT_OVERVIEW.md

VERIFY
- Show npm scripts and a short explanation of when we’ll need EAS Dev Client.

1) Navigation, theme, and base screens

Prompt

CONTEXT
- We have only a Home screen.

TASK
Install and wire React Navigation with a bottom tab + stack:
Tabs: Home, Search, Add, Folders, Profile, Memories
Each screen is a minimal placeholder with header titles and safe area.

DELIVERABLES
- Navigation scaffold (app/_layout or App.tsx using expo-router OR @react-navigation/native)
- Screens: HomeScreen, SearchScreen, AddScreen, FoldersScreen, ProfileScreen, MemoriesScreen
- Basic theme (light/dark) and a small UI kit (Button, Card, Text)

CONSTRAINTS
- TypeScript, strict mode.
- Keep UI simple and neutral.

VERIFY
- I can tap through all tabs without errors.

[Step -1.5] Git Setup

Prompt to Cursor

You are my senior React Native/Expo lead. I have just created a fresh Expo TypeScript app using:

  npx create-expo-app myAppName -t expo-template-blank-typescript

The app runs in Expo Go with `npm start`. Now I need to connect this project to Git and GitHub.

TASK
- Initialize a local git repo if one doesn't exist.
- Add a .gitignore suitable for Expo/React Native projects (node_modules, .expo, build outputs, etc.).
- Show me commands to make the first commit.
- Show me commands to create a new GitHub repo (from GitHub CLI OR via website).
- Provide the exact commands to add the remote and push my main branch up.
- Update my /docs/PROMPT_LOG.md to include an entry called "[Step -1.5] Git Setup".

DELIVERABLES
1. A .gitignore file tailored for Expo/React Native.
2. Step-by-step terminal commands I can run.
3. Example update for /docs/PROMPT_LOG.md.

VERIFY
- Git repository is initialized and properly configured.
- .gitignore file excludes all necessary Expo/React Native files.
- First commit is made with all project files.
- Remote repository is connected and code is pushed to GitHub.

2) Local data layer (MMKV or SQLite)

Prompt

CONTEXT
- We need local-first storage for Items, Folders, Tags, and a Memories index.

TASK
Implement a local data module:
- Choose expo-sqlite (recommended) with a small wrapper.
- Define tables: users (local shadow), items, folders, item_folders, tags, item_tags.
- Include created_at, ingested_at, source ('shared_url' | 'photo_scan').

DELIVERABLES
- src/data/db.ts (init + migrations)
- src/data/models.ts (TypeScript types)
- src/data/repositories/* (CRUD helpers)
- A simple seed function behind a dev-only command.

CONSTRAINTS
- Migrations versioned in code.
- No blocking UI on DB init.

VERIFY
- Home screen shows count of items/folders from local DB.

3) Backend: Supabase (auth + storage + optional vectors)

Prompt

CONTEXT
- We want simple cloud sync and optional semantic search later.

TASK
Set up Supabase client + schema script (SQL):
- Tables to mirror local: users, items, folders, item_folders, tags, item_tags.
- Policies: row-level security per user_id.
- Optional pgvector extension and items_embedding vector column.

DELIVERABLES
- src/lib/supabase.ts
- /supabase/schema.sql (items, folders, joins, tags, optional pgvector)
- Docs: /docs/SUPABASE_SETUP.md with step-by-step dashboard instructions.

CONSTRAINTS
- Don’t break Expo Go.
- Put keys in .env and load via expo-constants or react-native-dotenv.

VERIFY
- Add a “Sync now” button (dev-only) that upserts items/folders.
4) Permissions + Photos scan (detect screenshots)

Prompt

CONTEXT
- Need user-consented Photos access and a one-shot scan in Add screen.

TASK
Implement a Photos scanning utility using expo-media-library:
- Request permission with clear rationale.
- Enumerate recent images and detect likely Instagram screenshots via heuristics: filename matches ("IMG_*", "Screenshot"), aspect ratios common to Reels, presence of Instagram UI bands (basic pixel heuristics placeholder).
- Extract basic EXIF created time.

DELIVERABLES
- src/features/ingest/photosScan.ts
- AddScreen: "Scan Screenshots" button that ingests N sample items into local DB (source='photo_scan').

CONSTRAINTS
- Keep heuristics modular (plug in OCR later).
- Handle denied permission gracefully.

VERIFY
- After scan, Home shows new items count.

5) OCR pipeline (turn screenshots into searchable notes)
CONTEXT
- Screenshots may contain valuable text: article excerpts, video titles, Spotify track names, captions, etc.
- Need OCR to make them searchable and categorizable.

TASK
Add an OCR module with two modes:
- Mode A (demo, Expo Go): mock/cloud OCR placeholder.
- Mode B (Dev Client): integrate expo-text-recognition or similar OCR.
- Extract visible text into item.ocr_text.

DELIVERABLES
- src/features/ingest/ocr.ts
- Flag to toggle OCR on/off.
- Wire OCR into photosScan ingestion.

CONSTRAINTS
- Don’t block UI; process in background.
- Store status (ocr_done, ocr_text).

VERIFY
- ItemDetail shows extracted text snippet.
- Searching text finds items based on OCR content.


6) URL ingestion (manual entry now, APIs later)
CONTEXT
- Users often save things via URL (YouTube video, Spotify song, Instagram post, news article).
- In the future, we’ll connect directly to APIs (Instagram Graph, YouTube API, Facebook, Edge bookmarks).
- For now, allow manual URL entry to simulate.

TASK
Create “Add by URL” flow:
- User pastes a URL.
- Fetch allowed oEmbed/metadata (title, thumbnail).
- Persist to DB with source='url' and platform type (youtube, spotify, instagram, generic).

DELIVERABLES
- src/features/ingest/urlIngest.ts
- AddScreen > “Add by URL” field + Save button.

CONSTRAINTS
- No scraping; only safe metadata fetch.
- Fallback: if metadata not available, store plain URL.

VERIFY
- Paste a URL, save → item appears in Home with metadata.

🎨 Updated Preview Components:
Key Design Changes:
Rounded Bubble Design - Clean rounded corners (12px radius) with subtle shadows
Better Thumbnails - Larger 100x100px thumbnails with proper aspect ratios
Play Button Overlays - Semi-transparent circular play buttons for video content
iOS-Style Colors - Light gray backgrounds (#F8F9FA) with proper contrast
Clean Typography - Better font weights and spacing matching iOS design
Footer Styling - Gray footer bars with domain names (like "instagram.com", "youtu.be")
Instagram Preview:
✅ Instagram pink placeholder with camera icon
✅ Play button overlay for video content
✅ Clean title and description layout
✅ "instagram.com" footer
YouTube Preview:
✅ YouTube red placeholder with play icon
✅ Play button overlay for video thumbnails
✅ Multi-line title support (3 lines)
✅ "youtu.be" footer
Generic URL Preview:
✅ Platform-specific colors and icons
✅ Smart domain extraction (removes "www.")
✅ Fallback to platform colors when no thumbnail
✅ Clean web link styling