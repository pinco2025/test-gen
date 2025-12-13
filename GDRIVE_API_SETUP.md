# Google Drive API Setup Guide

This guide provides step-by-step instructions to configure the Google Drive API for the image upload functionality in this application. By following these steps, you will be able to replace the mock upload function with a real one that uploads files to a specific Google Drive folder.

## Prerequisites

-   A Google Account.
-   `node.js` and `npm` installed on your development machine.
-   Basic knowledge of TypeScript and Electron.

---

## Step 1: Set up a Google Cloud Project

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Click the project dropdown in the top navigation bar and click **"New Project"**.
3.  Give your project a name (e.g., "TestGen Pro Uploader") and click **"Create"**.

---

## Step 2: Enable the Google Drive API

1.  In your new project's dashboard, navigate to **"APIs & Services"** > **"Library"**.
2.  Search for **"Google Drive API"** and select it from the results.
3.  Click the **"Enable"** button.

---

## Step 3: Create Credentials

We will create an **API Key** for this guide for simplicity. For a production application, you should use OAuth 2.0 for better security.

1.  Go to **"APIs & Services"** > **"Credentials"**.
2.  Click **"+ CREATE CREDENTIALS"** at the top and select **"API key"**.
3.  Your API key will be created. **Copy it and keep it safe.**
4.  It is highly recommended to restrict your API key. Click **"Restrict key"** and under **"API restrictions"**, select **"Restrict key"** and choose the **"Google Drive API"**.

---

## Step 4: Create a Public Google Drive Folder

1.  Go to your [Google Drive](https://drive.google.com/).
2.  Create a new folder where you want the images to be stored.
3.  Right-click the folder and select **"Share"**.
4.  In the sharing dialog, under "General access," change "Restricted" to **"Anyone with the link"**.
5.  Copy the **Folder ID** from the URL in your browser's address bar. The URL will look like `https://drive.google.com/drive/folders/THIS_IS_THE_FOLDER_ID`.

---

## Step 5: Implement the Backend Upload Logic

The current application uses a mock upload function. You will need to replace it with actual API calls to Google Drive.

1.  **Install Google APIs Client Library:**
    ```bash
    npm install googleapis
    ```

2.  **Modify the IPC Handler:**
    Open `electron/main.ts` (or wherever your IPC handlers are defined) and create a handler to process the file upload.

3.  **Create the Upload Function:**
    You will need to write a function that takes the file path of the image selected by the user in the renderer process, reads it, and uploads it to your public Google Drive folder.

    Here is a sample implementation you can adapt. You would place this logic in your Electron main process file (`electron/main.ts` or a helper file).

    ```typescript
    // In your main Electron file (e.g., electron/main.ts)
    import { ipcMain } from 'electron';
    import { google } from 'googleapis';
    import * as fs from 'fs';
    import * as path from 'path';

    const API_KEY = 'YOUR_API_KEY'; // <-- PASTE YOUR API KEY HERE
    const FOLDER_ID = 'YOUR_FOLDER_ID'; // <-- PASTE YOUR FOLDER ID HERE

    const drive = google.drive({ version: 'v3', auth: API_KEY });

    ipcMain.handle('upload-image', async (event, filePath) => {
      try {
        const fileName = path.basename(filePath);

        const response = await drive.files.create({
          requestBody: {
            name: fileName,
            parents: [FOLDER_ID],
          },
          media: {
            mimeType: 'image/jpeg', // Or get dynamically
            body: fs.createReadStream(filePath),
          },
          fields: 'id, webViewLink',
        });

        const fileId = response.data.id;
        if (!fileId) {
          throw new Error('File ID not returned from Google Drive API.');
        }

        // Make the file publicly readable
        await drive.permissions.create({
          fileId: fileId,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });

        // The webViewLink is not a direct image link.
        // We construct the thumbnail link format used by the frontend.
        const thumbnailUrl = `https://lh3.googleusercontent.com/d/${fileId}`;

        return { success: true, url: thumbnailUrl };

      } catch (error)_ {
        console.error('Failed to upload file to Google Drive:', error);
        return { success: false, error: error.message };
      }
    });
    ```

4.  **Update the Frontend to Call the IPC Handler:**
    In `src/components/ImageUpload.tsx`, you need to modify the `uploadFile` function to use the new IPC handler instead of the mock timeout.

    First, you need to expose the handler in your preload script (`electron/preload.ts`):

    ```typescript
    // In electron/preload.ts
    contextBridge.exposeInMainWorld('electronAPI', {
      // ... other APIs
      uploadImage: (filePath) => ipcRenderer.invoke('upload-image', filePath)
    });
    ```

    And update your global types (`src/global.d.ts`):
    ```typescript
    // In src/global.d.ts
    export interface IElectronAPI {
        // ... other APIs
        uploadImage: (filePath: string) => Promise<{success: boolean, url?: string, error?: string}>;
    }
    ```

    Finally, update the `ImageUpload.tsx` component:

    ```tsx
    // In src/components/ImageUpload.tsx

    // This function will now call the backend
    const uploadFile = async (file: File): Promise<string> => {
      console.log(`Uploading: ${file.name}`);

      // The 'path' property is available on File objects in Electron environments
      const filePath = (file as any).path;
      if (!filePath) {
        throw new Error("File path is not available. This function must be run in an Electron environment.");
      }

      const result = await window.electronAPI.uploadImage(filePath);

      if (result.success && result.url) {
        console.log('Upload complete!');
        return result.url;
      } else {
        throw new Error(result.error || 'Unknown error during upload.');
      }
    };
    ```

---
This setup provides a complete, albeit basic, integration. Remember to handle errors gracefully and consider security best practices like OAuth 2.0 for a production-ready application.
