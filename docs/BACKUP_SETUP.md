# GitHub Backup Configuration Guide

## Quick Setup (3 Steps)

### Step 1: Open the Backup Service File
Open: `electron/githubBackupService.ts`

### Step 2: Update Configuration (Lines 5-10)

Replace the placeholder values:

```typescript
const BACKUP_CONFIG = {
  owner: 'YOUR_GITHUB_USERNAME',  // ← Change this
  repo: 'YOUR_BACKUP_REPO',       // ← Change this
  branch: 'main',                  // ← Keep or change branch
  backupPath: 'test-backups/'      // ← Folder in repo
};
```

**Example Configuration:**
```typescript
const BACKUP_CONFIG = {
  owner: 'harshitsayal',           // Your GitHub username
  repo: 'test-gen-backups',        // Your backup repository name
  branch: 'main',
  backupPath: 'test-backups/'
};
```

### Step 3: Create the GitHub Repository

1. Go to GitHub: https://github.com/new
2. Create a new repository with the name you chose (e.g., `test-gen-backups`)
3. Make it **private** (recommended) or public
4. No need to initialize with README

---

## How It Works

✅ **Automatic**: Backups happen every time you close the app
✅ **Progress Tracking**: Shows completion % and void sections
✅ **Non-Blocking**: Won't prevent app from closing
✅ **Uses Existing Token**: Reuses your GitHub export token

---

## Backup File Format

Each project creates a file: `test-backups/{project-id}.json`

Example content:
```json
{
  "testId": "JEE-MOCK-01",
  "completionPercentage": 40,
  "status": "in_progress",
  "sections": [
    {
      "name": "Physics",
      "status": "completed",
      "questionsCompleted": 25,
      "questionsTarget": 25
    },
    {
      "name": "Chemistry", 
      "status": "void",
      "voidMessage": "VOID - Section not started (0/25 questions)"
    }
  ]
}
```

---

## Testing Your Setup

1. **Configure** the settings above
2. **Open** the app and create a test with partial progress
3. **Close** the app (any close button works)
4. **Check console** for: `[Backup] ✓ Backed up project: {name}`
5. **Visit GitHub** repo to see the backup files

---

## Troubleshooting

### "Backup repository not configured"
- Check that you replaced `YOUR_GITHUB_USERNAME` and `YOUR_BACKUP_REPO`
- Values should NOT contain the placeholder text

### "GitHub token not available"
- Ensure you've set up GitHub integration in the app
- Check `config.json` has a valid GitHub token

### Backups not appearing on GitHub
- Verify repository name is exactly correct
- Check repository exists and you have write access
- Look for error messages in console

---

## Console Output Example

**Successful backup:**
```
[App] Backing up projects before close...
[Backup] Starting backup of 2 project(s)...
[Backup] ✓ Backed up project: JEE-MOCK-01
[Backup] ✓ Backed up project: NEET-TEST-05
[Backup] Completed. Backed up 2/2 project(s)
[App] ✓ Successfully backed up 2 project(s)
```

**With errors:**
```
[App] Backing up projects before close...
[Backup] Starting backup of 1 project(s)...
[Backup] ✗ Failed to backup project: TEST-001 - Not Found
[Backup] Completed. Backed up 0/1 project(s)
[App] ⚠ Backup completed with errors: TEST-001: Not Found
```

---

## Need Help?

- Check the full [walkthrough documentation](file:///C:/Users/Harshit%20Sayal/.gemini/antigravity/brain/fdcbaa05-3234-4ba1-9567-04bfadb0bd12/walkthrough.md)
- Verify your GitHub token is working in the main export feature
- Look for detailed error messages in the console
