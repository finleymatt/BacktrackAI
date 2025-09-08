# Testing Guide

This document describes the testing setup for Backtrack AI, including unit tests with Jest and E2E tests with Maestro.

## Unit Testing with Jest

### Setup
Jest is configured to run TypeScript tests with the following features:
- TypeScript support via `ts-jest`
- React Native module mocking
- Coverage reporting
- Fast execution with proper mocking

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Structure
Tests are organized by feature:
- `src/features/ingest/__tests__/ocr.test.ts` - OCR parser tests
- `src/features/search/__tests__/search.test.ts` - Search functionality tests
- `src/features/memories/__tests__/selectMemories.test.ts` - Memories selector tests
- `src/features/tags/__tests__/keywordTagger.test.ts` - Keyword tagger tests

### Mocking
The following modules are mocked for testing:
- `@react-native-async-storage/async-storage`
- `expo-sqlite`
- `expo-file-system`
- `expo-media-library`
- `expo-notifications`
- `@supabase/supabase-js`

## E2E Testing with Maestro

### Setup
Maestro is configured for end-to-end testing of the mobile app with the following flows:
- Add screenshot flow
- Add URL flow
- Search functionality
- Memories reminder
- Complete happy path

### Running E2E Tests
```bash
# Run the complete happy path
npm run test:e2e

# Run all E2E tests
npm run test:e2e:all

# Run specific flows
npm run test:e2e:screenshot
npm run test:e2e:url
npm run test:e2e:search
npm run test:e2e:memories
```

### E2E Test Flows

#### Add Screenshot Flow (`.maestro/add-screenshot.yaml`)
1. Launch app
2. Navigate to Add screen
3. Select "Add Screenshot"
4. Grant gallery permissions
5. Select an image
6. Verify OCR processing
7. Confirm success

#### Add URL Flow (`.maestro/add-url.yaml`)
1. Launch app
2. Navigate to Add screen
3. Select "Add URL"
4. Enter a YouTube URL
5. Verify URL processing
6. Confirm success

#### Search Flow (`.maestro/search.yaml`)
1. Launch app
2. Navigate to Search screen
3. Enter search query
4. Apply filters
5. View search results
6. Navigate to item detail
7. Return to search

#### Memories Reminder Flow (`.maestro/memories-reminder.yaml`)
1. Launch app
2. Navigate to Memories screen
3. View memory categories
4. Access memory items
5. Check settings
6. Modify cadence

#### Happy Path Flow (`.maestro/happy-path.yaml`)
Complete user journey covering:
- Adding screenshots and URLs
- Searching for content
- Viewing memories
- Managing folders
- Accessing profile settings

## Test Configuration

### Jest Configuration (`jest.config.js`)
- Preset: `ts-jest`
- Test environment: `node`
- Coverage collection from `src/**/*.{ts,tsx}`
- React Native module mocking
- Setup file: `jest.setup.js`

### Maestro Configuration (`.maestro/config.yaml`)
- App ID: `com.backtrackai.backtrack`
- Timeout: 30 seconds
- Retries: 3 attempts

## Best Practices

### Unit Tests
- Test individual functions and methods
- Mock external dependencies
- Use descriptive test names
- Test both success and error cases
- Keep tests fast and isolated

### E2E Tests
- Test complete user workflows
- Use realistic test data
- Verify UI elements and interactions
- Test error scenarios
- Keep tests maintainable

## Continuous Integration

### GitHub Actions (Recommended)
```yaml
name: Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
  
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:e2e
```

## Troubleshooting

### Common Issues

#### Jest Tests Failing
- Check that all dependencies are installed
- Verify mock configurations
- Ensure test files follow naming conventions

#### Maestro Tests Failing
- Verify app is installed on device/emulator
- Check that app ID matches configuration
- Ensure UI elements are visible and accessible
- Check device/emulator permissions

#### Coverage Issues
- Verify test files are not excluded from coverage
- Check that source files are properly included
- Ensure tests cover all code paths

## Performance

### Unit Tests
- Target: < 5 seconds for full test suite
- Individual tests: < 100ms
- Use mocks to avoid slow operations

### E2E Tests
- Target: < 2 minutes for complete flow
- Use appropriate timeouts
- Minimize unnecessary waits

## Maintenance

### Regular Tasks
- Update test dependencies
- Review and update mocks
- Add tests for new features
- Refactor flaky tests
- Update E2E flows for UI changes

### Test Data
- Use consistent test data
- Clean up test data after tests
- Avoid hardcoded values
- Use factories for test data generation
