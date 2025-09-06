# Instagram Content Organizer - Project Overview

## Target Stack

**Primary Stack:**
- **React Native + Expo** (SDK 53+)
- **EAS Build** for cloud-based iOS builds (Windows-compatible)
- **EAS Dev Client** (required for advanced features)
- **TypeScript** for type safety

**Backend & Storage:**
- **Supabase** (PostgreSQL + Auth + Real-time + Storage)
- **React Native MMKV** for local storage/caching
- **Expo SQLite** (fallback for complex queries)

## Key Packages

### Core Navigation & UI
- `@react-navigation/native` + `@react-navigation/stack` + `@react-navigation/bottom-tabs`
- `react-native-screens` + `react-native-safe-area-context`
- `expo-linear-gradient` for modern UI

### Media & Photos
- `expo-media-library` - iOS Photos library access
- `expo-image-picker` - Photo selection
- `expo-av` - Video playback and processing
- `expo-camera` - Camera access (future feature)

### Background Processing & Notifications
- `expo-task-manager` - Background tasks
- `expo-background-fetch` - Periodic background sync
- `expo-notifications` - Push notifications
- `expo-location` - Location-based features

### AI & Text Processing
- `expo-vision` - OCR for screenshots
- `expo-speech` - Text-to-speech
- `@react-native-async-storage/async-storage` - Local data persistence

### Networking & APIs
- `@supabase/supabase-js` - Backend services
- `expo-linking` - Deep linking & Share Extension
- `expo-web-browser` - OAuth flows

### Development & Build
- `eas-cli` - EAS Build management
- `expo-dev-client` - Custom development client

## Feature Checklist

### Phase 1: Core Infrastructure ✅
- [x] Expo project setup
- [x] TypeScript configuration
- [x] Navigation structure
- [ ] Supabase backend setup
- [ ] Basic authentication
- [ ] Local storage implementation

### Phase 2: Content Ingestion 📱
- [ ] Share Extension for Instagram URLs
- [ ] iOS Photos library scanning
- [ ] Screenshot detection & OCR
- [ ] Manual content addition
- [ ] URL metadata extraction (oEmbed/Graph API)

### Phase 3: AI & Organization 🤖
- [ ] Auto-categorization with AI
- [ ] Text extraction from images
- [ ] Video transcription
- [ ] Smart tagging system
- [ ] Content similarity detection

### Phase 4: Search & Discovery 🔍
- [ ] Full-text search
- [ ] Visual search
- [ ] Filter by category/tags
- [ ] Date range filtering
- [ ] Saved search queries

### Phase 5: Social Features 👥
- [ ] Private/public folder system
- [ ] User profiles
- [ ] Follow/subscribe system
- [ ] Content sharing
- [ ] Collaboration features

### Phase 6: Advanced Features 🚀
- [ ] Background sync
- [ ] Offline support
- [ ] Push notifications
- [ ] Analytics dashboard
- [ ] Export functionality

## Development Phases

### Current: Expo Go Compatible
- Basic navigation
- UI components
- Supabase integration
- Local storage

### Requires EAS Dev Client
- Share Extension
- Background tasks
- Advanced camera features
- Native modules (OCR, etc.)

## Compliance & Privacy

### Instagram/Meta API Compliance
- ✅ **oEmbed API** - Public post metadata (no auth required)
- ✅ **Graph API** - Limited public data only
- ❌ **Private saved content** - Not available via official APIs
- ✅ **Share Extension** - User-initiated content sharing
- ✅ **Screenshot analysis** - On-device processing only

### Privacy Permissions
- **Photos Library** - Read access for screenshot detection
- **Camera** - Future feature for content capture
- **Network** - API calls and sync
- **Notifications** - Background sync alerts
- **Location** - Optional for location-based organization

### Data Handling
- All processing happens on-device when possible
- No scraping or ToS violations
- User consent for all data collection
- GDPR/CCPA compliant data handling

## Build Strategy (Windows → iOS)

1. **Development**: Expo Go for basic features
2. **Testing**: EAS Dev Client for advanced features
3. **Production**: EAS Build for App Store distribution
4. **CI/CD**: GitHub Actions + EAS Build

## Next Steps

1. Set up Supabase project
2. Configure EAS Build
3. Implement basic navigation
4. Add Share Extension
5. Build screenshot detection
6. Integrate AI categorization
