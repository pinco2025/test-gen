# Google Drive OAuth 2.0 Setup Guide

This application now uses OAuth 2.0 to upload images to **your personal Google Drive** instead of using service accounts. This means images will be stored in the authenticated user's Google Drive.

## Prerequisites

- Google Cloud Platform account
- Access to Google Cloud Console

## Step 1: Create OAuth 2.0 Credentials

### 1.1 Go to Google Cloud Console
1. Visit [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one

### 1.2 Enable Google Drive API
1. Go to **APIs & Services** > **Library**
2. Search for "Google Drive API"
3. Click **Enable**

### 1.3 Create OAuth 2.0 Client ID
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen:
   - **User Type**: Choose "External" (or "Internal" if using Google Workspace)
   - **App name**: Enter your app name (e.g., "Test Generator")
   - **User support email**: Your email
   - **Developer contact information**: Your email
   - **Scopes**: Add `https://www.googleapis.com/auth/drive.file`
   - **Test users** (if External): Add your email address
   - Click **Save and Continue**

4. Back in Credentials, click **Create Credentials** > **OAuth client ID**
5. **Application type**: Select **Desktop app**
6. **Name**: Enter a name (e.g., "Test Generator Desktop")
7. Click **Create**

### 1.4 Download Credentials
1. After creation, a dialog will appear with your Client ID and Client Secret
2. Click **Download JSON**
3. Rename the downloaded file to `oauth-credentials.json`

## Step 2: Configure the Application

### 2.1 Place Credentials File
1. Copy `oauth-credentials.json` to the root directory of this application:
   ```
   /path/to/test-gen/oauth-credentials.json
   ```

2. **IMPORTANT**: Make sure `oauth-credentials.json` is in your `.gitignore` to avoid exposing credentials

### 2.2 Verify File Structure
Your `oauth-credentials.json` should look like this:
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

Or if you selected "Web application":
```json
{
  "web": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "project_id": "your-project-id",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_secret": "YOUR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost"],
    "javascript_origins": ["http://localhost"]
  }
}
```

**Note**: The application expects the credentials under either the `installed` or `web` key. Make sure your file matches one of these structures.

## Step 3: First-Time Authentication

### 3.1 Run the Application
1. Start the application
2. When you first try to upload an image, a browser window will open
3. You'll be prompted to sign in with your Google account
4. Grant the requested permissions (access to Google Drive)
5. The window will close automatically after successful authentication

### 3.2 Token Storage
- After authentication, an OAuth token will be saved at:
  ```
  ~/.config/test-gen-engine/google-oauth-tokens.json
  ```
  (Path may vary based on your OS)

- This token will be automatically refreshed when it expires
- You won't need to re-authenticate unless you clear tokens or revoke access

## Step 4: Using the Upload Feature

1. Click the image upload button in the question editor
2. Select an image file
3. The image will be uploaded to **your Google Drive**
4. The image URL will be automatically embedded in the question

## Troubleshooting

### "OAuth client not initialized" Error
- Ensure `oauth-credentials.json` exists in the application root directory
- Check that the file contains valid JSON
- Verify the file structure matches the expected format

### Authentication Window Doesn't Open
- Check your firewall settings
- Ensure ports are not blocked
- Try restarting the application

### "Access Denied" or "Invalid Grant" Errors
- Clear tokens: Delete the token file at `~/.config/test-gen-engine/google-oauth-tokens.json`
- Re-authenticate by uploading an image again

### Token Refresh Fails
- The refresh token may have expired (happens after long periods of inactivity)
- Clear tokens and re-authenticate

### Images Not Uploading
- Verify you've enabled the Google Drive API in Google Cloud Console
- Check that your OAuth consent screen is configured correctly
- Ensure your account is added as a test user (if using External user type)

## Security Notes

1. **Never commit** `oauth-credentials.json` to version control
2. Keep your Client Secret confidential
3. OAuth tokens are stored locally and encrypted by the OS
4. You can revoke access anytime from [Google Account Permissions](https://myaccount.google.com/permissions)

## Migrating from Service Accounts

If you were previously using service accounts:

1. Images uploaded with service accounts will remain in the service account's Drive
2. New images will be uploaded to your personal Drive using OAuth
3. No migration of old images is necessary - they'll continue to work
4. You can delete `gdrive-credentials.json` (service account key) if no longer needed

## Additional Resources

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 for Desktop Apps](https://developers.google.com/identity/protocols/oauth2/native-app)
