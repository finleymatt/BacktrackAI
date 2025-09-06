# Git Workflow Guide

## 🔄 Daily Git Workflow

### Quick Save (Most Common)
```powershell
# Stage all changes and commit with a descriptive message
git add .
git commit -m "Add new feature: [describe what you added]"

# Push to GitHub
git push
```

### More Granular Control
```powershell
# Check what files have changed
git status

# Stage specific files (if you don't want to commit everything)
git add src/components/Button.tsx
git add src/screens/HomeScreen.tsx

# Commit with a descriptive message
git commit -m "Update Button component styling and HomeScreen layout"

# Push to GitHub
git push
```

## 📝 Best Practices for Commit Messages

### Good Commit Messages:
```powershell
git commit -m "Add dark mode toggle to settings"
git commit -m "Fix navigation bug in ProfileScreen"
git commit -m "Update Button component with new variants"
git commit -m "Add TypeScript types for user data"
git commit -m "Implement photo picker functionality"
```

### Avoid Vague Messages:
```powershell
# ❌ Bad
git commit -m "fix stuff"
git commit -m "updates"
git commit -m "changes"

# ✅ Good
git commit -m "Fix button press handling in AddScreen"
git commit -m "Update navigation header styling"
git commit -m "Add error handling for photo uploads"
```

## 🚀 Recommended Workflow

### 1. Before You Start Coding:
```powershell
# Pull latest changes (if working with others)
git pull
```

### 2. During Development:
```powershell
# Check what you've changed
git status

# See the actual changes
git diff
```

### 3. When You Want to Save:
```powershell
# Quick save everything
git add .
git commit -m "Descriptive message about what you changed"
git push
```

### 4. Before Major Features:
```powershell
# Create a new branch for big features
git checkout -b feature/photo-picker
# ... make changes ...
git add .
git commit -m "Implement photo picker with OCR integration"
git push -u origin feature/photo-picker
```

## PowerShell Aliases (Optional)

You can create shortcuts in PowerShell by adding these to your PowerShell profile:

```powershell
# Add to your PowerShell profile
function gac { git add .; git commit -m $args; git push }
function gs { git status }
function gd { git diff }
function gp { git pull }
function gl { git log --oneline }
```

Then use:
```powershell
gac "Add new feature description"
gs  # Check status
gd  # See changes
gp  # Pull latest
gl  # See commit history
```

## 📋 Daily Routine Example

```powershell
# Morning: Start fresh
git pull

# During development: Check changes
git status

# When you finish a feature/component:
git add .
git commit -m "Add responsive layout to FoldersScreen"
git push

# End of day: Final save
git add .
git commit -m "End of day: Complete navigation improvements"
git push
```

## 🔍 Useful Git Commands

### Basic Commands
```powershell
# See your commit history
git log --oneline

# See what files changed in last commit
git show --name-only

# See changes before committing
git diff --staged

# See all changes (staged and unstaged)
git diff
```

### Undo Commands
```powershell
# Undo last commit (but keep changes)
git reset --soft HEAD~1

# Undo last commit and discard changes
git reset --hard HEAD~1

# Undo staging (unstage files)
git reset HEAD <filename>
```

### Branch Commands
```powershell
# Create and switch to new branch
git checkout -b feature/new-feature

# Switch to existing branch
git checkout main

# List all branches
git branch -a

# Delete branch (after merging)
git branch -d feature/old-feature
```

### Remote Commands
```powershell
# See remote repositories
git remote -v

# Add remote repository
git remote add origin https://github.com/username/repo.git

# Push to specific branch
git push origin feature-branch

# Pull from specific branch
git pull origin main
```

## 🎯 Quick Reference Card

### Most Common Workflow
```powershell
git add .
git commit -m "Your descriptive message"
git push
```

### Check Status
```powershell
git status
git diff
```

### See History
```powershell
git log --oneline
```

### Branch Workflow
```powershell
git checkout -b feature/name
# ... make changes ...
git add .
git commit -m "Feature description"
git push -u origin feature/name
```

## 💡 Pro Tips

1. **Commit Often**: Small, frequent commits are better than large ones
2. **Test Before Committing**: Make sure your app still runs with `npm start`
3. **Use Branches**: For experimental features
4. **Write Good Messages**: Future you will thank you
5. **Push Regularly**: Don't let changes pile up
6. **Use .gitignore**: Keep sensitive files out of version control

## 🚨 Common Issues & Solutions

### Issue: "Your branch is ahead of origin"
```powershell
# Solution: Push your changes
git push
```

### Issue: "Your branch is behind origin"
```powershell
# Solution: Pull latest changes
git pull
```

### Issue: Merge conflicts
```powershell
# Solution: Resolve conflicts in your editor, then:
git add .
git commit -m "Resolve merge conflicts"
git push
```

### Issue: Accidentally committed sensitive files
```powershell
# Solution: Remove from history (use carefully!)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch path/to/file' --prune-empty --tag-name-filter cat -- --all
```

## 📚 Additional Resources

- [Git Official Documentation](https://git-scm.com/doc)
- [GitHub Git Handbook](https://guides.github.com/introduction/git-handbook/)
- [Conventional Commits](https://www.conventionalcommits.org/) (for standardized commit messages)

## 🔧 Development Integration

### Before Committing (Recommended)
```powershell
# Format code
npm run format

# Check for linting errors
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Type checking
npm run type-check

# Then commit
git add .
git commit -m "Your message"
git push
```

### Automated Workflow Script
Create a `save.ps1` script in your project root:
```powershell
# save.ps1
param(
    [Parameter(Mandatory=$true)]
    [string]$Message
)

Write-Host "Formatting code..." -ForegroundColor Yellow
npm run format

Write-Host "Checking for linting errors..." -ForegroundColor Yellow
npm run lint:fix

Write-Host "Type checking..." -ForegroundColor Yellow
npm run type-check

Write-Host "Committing changes..." -ForegroundColor Green
git add .
git commit -m $Message
git push

Write-Host "Changes saved successfully!" -ForegroundColor Green
```

Usage:
```powershell
.\save.ps1 "Add new feature description"
```
