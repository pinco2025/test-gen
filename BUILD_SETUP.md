# Build Setup Guide

This guide explains how to properly configure and build the Test Generator app for distribution to other machines.

## Prerequisites

Before building the app, you need to set up two configuration files that will be bundled with the application:

### 1. OAuth Credentials (`oauth-credentials.json`)

This file contains Google OAuth 2.0 credentials for Google Drive integration.

**Steps to create:**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Choose application type: "Desktop app"
6. Download the credentials JSON file
7. Save it as `oauth-credentials.json` in the project root directory

**Expected format:**
```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost"]
  }
}
```

### 2. Application Config (`config.json`)

This file contains configuration for GitHub and Supabase integrations.

**Steps to create:**

1. Copy the example config:
   ```bash
   cp config.example.json config.json
   ```

2. Edit `config.json` with your actual credentials:

```json
{
  "github": {
    "enabled": true,
    "token": "YOUR_GITHUB_PERSONAL_ACCESS_TOKEN",
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "YOUR_REPO_NAME",
    "branch": "main"
  },
  "supabase": {
    "enabled": true,
    "url": "https://YOUR_PROJECT_ID.supabase.co",
    "anonKey": "YOUR_ANON_KEY",
    "accessToken": "OPTIONAL_JWT_OR_SERVICE_ROLE_KEY"
  }
}
```

**To get GitHub Personal Access Token:**
- Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token with `repo` scope
- Copy the token to the `config.json`

**To get Supabase credentials:**
- Go to your [Supabase project dashboard](https://app.supabase.com/)
- Navigate to Settings → API
- Copy the Project URL and anon/public key

## Building the Application

Once you have both `oauth-credentials.json` and `config.json` configured in the project root:

### Development Build
```bash
npm run dev
```

### Production Build

For Windows (Portable):
```bash
npm run build
# or
npm run electron:build
```

For Distribution:
```bash
npm run dist
```

For Package (without installer):
```bash
npm run pack
```

## What Gets Bundled

The build process automatically includes:
- ✅ `oauth-credentials.json` - OAuth credentials for Google Drive
- ✅ `config.json` - GitHub and Supabase configuration
- ✅ All application code and dependencies
- ✅ SQLite database schema

## File Locations After Build

When the app is packaged, these files are bundled as **extraResources** and located at:

- **Windows**: `{app-directory}/resources/oauth-credentials.json` and `config.json`
- **macOS**: `{app-directory}/Contents/Resources/oauth-credentials.json` and `config.json`
- **Linux**: `{app-directory}/resources/oauth-credentials.json` and `config.json`

The application automatically detects and loads these files from the correct location.

## Security Notes

⚠️ **IMPORTANT**:
- Both `oauth-credentials.json` and `config.json` are in `.gitignore` to prevent accidental commits
- These files contain sensitive credentials - never commit them to version control
- When distributing the app, ensure you're comfortable with these credentials being bundled
- Consider using different credentials for development vs. production builds

## Troubleshooting

### "OAuth credentials not found" error
- Ensure `oauth-credentials.json` exists in the project root before building
- Verify the file has the correct format with `installed` or `web` key
- Check that the file is not empty or corrupted

### "Config file not found" error
- Ensure `config.json` exists in the project root before building
- Verify it follows the expected JSON structure
- Make sure there are no JSON syntax errors

### App still asks for credentials on new machine
- Verify you ran the build AFTER creating both config files
- Check that the files were actually included in the build (look in the release folder)
- Ensure you're using the latest build with the updated packaging configuration

## Distribution Checklist

Before distributing the app to other machines:

- [ ] Created `oauth-credentials.json` with valid Google OAuth credentials
- [ ] Created `config.json` with GitHub and Supabase configuration
- [ ] Replaced placeholder values in `config.json` with real credentials
- [ ] Tested the app locally to ensure credentials work
- [ ] Built the app using `npm run build` or `npm run dist`
- [ ] Verified the built app contains the config files
- [ ] Tested the built app on the same machine
- [ ] Ready to distribute to other machines!

## Clean Build

If you need to start fresh:

```bash
# Remove build artifacts
rm -rf dist dist-electron release

# Remove node modules and reinstall
rm -rf node_modules
npm install

# Rebuild
npm run build
```
