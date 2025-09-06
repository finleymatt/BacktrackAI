# 🚀 Daily Startup Guide for Expo Go

A reliable step-by-step routine to start your app each day without issues.

## Quick Daily Routine (30 seconds)

```powershell
# Navigate to project
cd C:\BacktrackAI\Backtrack

# Quick start (if everything was working yesterday)
npm run start
```

## Full Daily Startup (Recommended)

### **Step 1: Open Terminal & Navigate to Project**
```powershell
# Open PowerShell and navigate to your project
cd C:\BacktrackAI\Backtrack
```

### **Step 2: Check Git Status (Optional but Recommended)**
```powershell
# See what files have changed since last session
git status

# If you have uncommitted changes, save them first
git add .
git commit -m "Save work from previous session"
git push
```

### **Step 3: Clean Start (Recommended for Daily Startup)**
```powershell
# Clear npm cache (fixes most dependency issues)
npm cache clean --force

# Clear Expo cache (fixes Metro bundler issues)
npx expo start --clear
```

### **Step 4: Start the Development Server**
```powershell
# Start Expo development server
npm run start
```

**Alternative commands if you have issues:**
```powershell
# If npm run start has issues, try direct expo command
npx expo start

# For a completely fresh start
npx expo start --clear --reset-cache
```

### **Step 5: Open Expo Go on Your Phone**
1. **Open Expo Go app** on your phone
2. **Scan the QR code** that appears in your terminal
3. **Wait for the app to load** (first load can take 30-60 seconds)

## Troubleshooting

### Common Issues & Solutions

#### **Issue: "Metro bundler not starting"**
```powershell
# Kill any existing Metro processes
npx expo start --clear --reset-cache
```

#### **Issue: "Cannot connect to development server"**
```powershell
# Make sure you're on the same WiFi network
# Try using tunnel mode
npx expo start --tunnel
```

#### **Issue: "App crashes on startup"**
```powershell
# Clear all caches and restart
npm cache clean --force
npx expo start --clear --reset-cache
```

#### **Issue: "Dependencies not found"**
```powershell
# Reinstall dependencies
rm -rf node_modules
npm install
npx expo start --clear
```

### Full Reset Routine (2 minutes - when having issues)
```powershell
# Navigate to project
cd C:\BacktrackAI\Backtrack

# Clean everything
npm cache clean --force
npx expo start --clear --reset-cache
```

## Pro Tips for Reliable Startup

1. **Always use the same terminal**: Keep PowerShell open in your project directory
2. **Same WiFi network**: Make sure your computer and phone are on the same network
3. **Close other apps**: Close other development servers that might conflict
4. **Restart if needed**: If you have persistent issues, restart your computer
5. **Keep Expo Go updated**: Update the Expo Go app on your phone regularly

## Troubleshooting Checklist

- ✅ Computer and phone on same WiFi
- ✅ Expo Go app is updated
- ✅ No firewall blocking Metro bundler
- ✅ Terminal shows "Metro waiting on exp://192.168.x.x:8081"
- ✅ QR code is visible and scannable

## When to Use Each Command

- **`npm run start`**: Normal daily startup
- **`npx expo start --clear`**: When you have caching issues
- **`npx expo start --tunnel`**: When WiFi connection is problematic
- **`npx expo start --clear --reset-cache`**: When nothing else works

## Available Scripts Reference

From your `package.json`:

```bash
npm run start          # Start Expo development server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run on web browser
npm run format         # Format code with Prettier
npm run lint           # Lint code with ESLint
npm run lint:fix       # Fix auto-fixable linting issues
npm run type-check     # Run TypeScript type checking
```

## Notes

- The key to reliable startup is the `--clear` flag which clears Metro's cache
- Use `--reset-cache` for more stubborn issues
- First load can take 30-60 seconds, subsequent loads are faster
- Keep your Expo Go app updated for best compatibility
