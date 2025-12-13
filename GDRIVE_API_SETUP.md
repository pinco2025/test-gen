# Google Drive API Setup Guide (Service Account)

This guide provides step-by-step instructions to configure the Google Drive API using a **Service Account** for the image upload functionality. This is a secure method for server-to-server communication, perfect for an Electron backend.

By following these steps, you will be able to replace the mock upload function with a real one that uploads files to a specific, private Google Drive folder.

## Prerequisites

-   A Google Account.
-   A Google Cloud Project.
-   `node.js` and `npm` installed on your development machine.
-   Basic knowledge of TypeScript and Electron.

---

## Step 1: Enable the Google Drive API

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/) and select your project.
2.  Navigate to **"APIs & Services"** > **"Library"**.
3.  Search for **"Google Drive API"** and select it from the results.
4.  Click the **"Enable"** button.

---

## Step 2: Create a Service Account

1.  Go to **"APIs & Services"** > **"Credentials"**.
2.  Click **"+ CREATE CREDENTIALS"** at the top and select **"Service account"**.
3.  Fill in the service account details:
    *   **Service account name:** A descriptive name, e.g., "TestGen Pro Uploader".
    *   **Service account ID:** This will be auto-generated.
    *   **Description:** (Optional) e.g., "Handles image uploads for the test generator app".
4.  Click **"CREATE AND CONTINUE"**.
5.  **Grant access (optional):** You can skip this for now by clicking **"CONTINUE"**. We will control access via folder permissions.
6.  **Grant user access (optional):** You can also skip this step. Click **"DONE"**.

---

## Step 3: Generate a Service Account Key

1.  After creating the service account, you'll be back on the Credentials screen. Find your new service account in the "Service Accounts" list and click on it.
2.  Go to the **"KEYS"** tab.
3.  Click **"ADD KEY"** and select **"Create new key"**.
4.  Choose **JSON** as the key type and click **"CREATE"**.
5.  A JSON file containing your credentials will be downloaded. **Treat this file like a password!**
6.  Move this file into your project's root directory (or a config folder) and rename it to something like `gdrive-credentials.json`.
7.  **IMPORTANT:** Add the name of this JSON file to your `.gitignore` file to prevent it from ever being committed to version control.
    ```
    # .gitignore
    gdrive-credentials.json
    ```

---

## Step 4: Create & Share a Google Drive Folder

1.  Go to your [Google Drive](https://drive.google.com/).
2.  Create a new folder where you want the images to be stored (e.g., "TestGenAppUploads").
3.  Open the service account's JSON key file and find the `client_email` value. It will look something like `your-service-account-name@your-project-id.iam.gserviceaccount.com`. Copy this email address.
4.  Right-click the new folder in Google Drive and select **"Share"**.
5.  Paste the service account's email address into the "Add people and groups" field.
6.  Grant it **"Editor"** permissions. This allows the service account to add files to this folder.
7.  Click **"Share"**.
8.  Finally, get the **Folder ID** from the URL in your browser's address bar. The URL will look like `https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID`. Copy this ID.

---

## Step 5: Implement the Backend Upload Logic

The current application uses a mock upload function. You will need to replace it with actual API calls to Google Drive using your service account credentials.

1.  **Install Google APIs Client Library:**
    ```bash
    npm install googleapis
    ```

2.  **Update the Backend Upload Function:**
    Here is a sample implementation for your Electron main process file (`electron/main.ts` or a helper file). This code uses the service account's JSON key to authenticate.

    ```typescript
    // In your main Electron file (e.g., electron/main.ts)
    import { ipcMain } from 'electron';
    import { google } from 'googleapis';
    import * as fs from 'fs';
    import * as path from 'path';

    const FOLDER_ID = 'YOUR_FOLDER_ID'; // <-- PASTE YOUR FOLDER ID HERE
    const KEY_FILE_PATH = path.join(__dirname, 'gdrive-credentials.json'); // Adjust path if needed

    // Configure the Google Auth client
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_FILE_PATH,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth });

    ipcMain.handle('upload-image', async (event, filePath) => {
      try {
        const fileName = path.basename(filePath);

        const response = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [FOLDER_ID],
          },
          media: {
            // e.g., 'image/png' or 'image/jpeg'
            mimeType: 'image/jpeg',
            body: fs.createReadStream(filePath),
          },
          fields: 'id', // We only need the ID for the thumbnail URL
        });

        const fileId = response.data.id;
        if (!fileId) {
          throw new Error('File ID not returned from Google Drive API.');
        }

        // The file is automatically shared with anyone who has access to the folder.
        // We construct the thumbnail link format used by the frontend.
        const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

        return { success: true, url: thumbnailUrl };

      } catch (error) {
        console.error('Failed to upload file to Google Drive:', error);
        return { success: false, error: error.message };
      }
    });
    ```

3.  **Update the Frontend to Call the IPC Handler:**
    The frontend code in `src/components/ImageUpload.tsx` remains the same as in the previous guide. You just need to ensure the preload script (`electron/preload.ts`) and global types (`src/global.d.ts`) are correctly set up to expose the `uploadImage` IPC handler.

This setup provides a complete and secure integration using a service account.
