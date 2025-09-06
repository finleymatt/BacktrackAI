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