# Instagram Content Organizer

A React Native + Expo app that helps you organize and search your Instagram saved content and screenshots with AI-powered categorization.

## Features

- 📱 **Content Ingestion**: Share Extension for Instagram URLs, iOS Photos library scanning
- 🤖 **AI Organization**: Auto-categorization, text extraction, video transcription
- 🔍 **Smart Search**: Full-text search, visual search, filter by categories
- 👥 **Social Layer**: Private/public folders, sharing, follow/subscribe system
- 🔒 **Privacy First**: On-device processing, compliant with Instagram ToS

## Tech Stack

- **Frontend**: React Native + Expo (SDK 53+)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Build**: EAS Build (Windows → iOS compatible)
- **Language**: TypeScript

## Development Setup

### Prerequisites

- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`
- iOS Simulator (for testing)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## Available Scripts

### Development
```bash
npm run start          # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run on web browser
```

### Code Quality
```bash
npm run format         # Format code with Prettier
npm run lint           # Lint code with ESLint
npm run lint:fix       # Fix auto-fixable linting issues
npm run type-check     # Run TypeScript type checking
```

### Testing
```bash
npm run test           # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage report
```

### Build & Deploy
```bash
npm run build:dev      # Build development version
npm run build:prod     # Build production version
npm run submit:ios     # Submit to App Store
npm run submit:android # Submit to Google Play
```

## Development Phases

### Phase 1: Expo Go Compatible ✅
- Basic navigation and UI
- Supabase integration
- Local storage

### Phase 2: EAS Dev Client Required
- Share Extension
- Background tasks
- Advanced camera features
- Native modules (OCR, etc.)

## Project Structure

```
Backtrack/
├── docs/                    # Documentation
│   ├── PROJECT_OVERVIEW.md  # Project overview and roadmap
│   └── PROMPT_LOG.md        # Development log
├── src/                     # Source code
│   ├── components/          # Reusable components
│   ├── screens/             # Screen components
│   ├── navigation/          # Navigation configuration
│   ├── services/            # API and business logic
│   ├── utils/               # Utility functions
│   └── types/               # TypeScript type definitions
├── assets/                  # Static assets
└── app.json                 # Expo configuration
```

## Privacy & Compliance

This app is designed to be fully compliant with Instagram's Terms of Service:

- ✅ Uses official APIs (oEmbed, Graph API) where available
- ✅ Share Extension for user-initiated content sharing
- ✅ On-device screenshot analysis (no scraping)
- ✅ No access to private saved content via unofficial means
- ✅ User consent for all data collection

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.


