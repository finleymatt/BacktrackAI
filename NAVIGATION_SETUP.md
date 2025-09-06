# Navigation Setup

This document describes the React Navigation setup for the BacktrackAI app.

## Structure

### Navigation Components
- **AppNavigator**: Main navigation container with stack navigation
- **TabNavigator**: Bottom tab navigation with 6 tabs

### Tabs
1. **Home** - Main dashboard and recent activity
2. **Search** - Search through content and memories
3. **Add** - Add new content to the collection
4. **Folders** - Organize content into folders
5. **Profile** - User profile and settings
6. **Memories** - Browse saved memories

### Theme System
- Light and dark theme support
- Consistent colors, typography, and spacing
- Theme toggle available on Home screen

### UI Components
- **Text**: Typography component with variants (h1, h2, h3, body, etc.)
- **Button**: Button component with variants (primary, secondary, outline)
- **Card**: Card component with padding and elevation options

## Usage

The app uses React Navigation v6 with:
- Bottom tab navigation for main app sections
- Stack navigation for future screen transitions
- Safe area handling for all screens
- TypeScript support with strict mode

## Testing

To test the navigation:
1. Run `npm start` to start the development server
2. Open the app on your device/simulator
3. Tap through all tabs to verify navigation works
4. Test theme toggle on the Home screen
