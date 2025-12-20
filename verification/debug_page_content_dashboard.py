from playwright.sync_api import sync_playwright
import os
import subprocess
import time
import sys

def debug_content():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        page.add_init_script("""
            window.electronAPI = {
                config: {
                    get: () => Promise.resolve({ databasePath: null, chaptersPath: null, lastProjectId: null }),
                    update: (updates) => Promise.resolve({ success: true })
                },
                db: {
                    connect: (path) => Promise.resolve({ success: true }),
                    isConnected: () => Promise.resolve(false),
                    selectFile: () => Promise.resolve({ success: true, path: '/mock/path/to/database.db' })
                },
                chapters: {
                    load: () => Promise.resolve({}),
                    selectFile: () => Promise.resolve({ success: true, path: '/mock/path/to/chapters.json' })
                },
                project: {
                    list: () => Promise.resolve([]),
                    exists: () => Promise.resolve(false)
                },
                window: {
                    minimize: () => Promise.resolve(),
                    maximize: () => Promise.resolve(),
                    close: () => Promise.resolve()
                }
            };
        """)

        server = subprocess.Popen([sys.executable, "-m", "http.server", "3000"], cwd="dist")
        time.sleep(2)

        try:
            page.goto("http://localhost:3000")
            page.get_by_text("Create, configure, and export practice tests").click()
            page.click("text=Select Database File")
            page.wait_for_timeout(500)
            page.click("text=Select Chapters File")
            page.wait_for_timeout(1000)

            # Print the HTML content of the main container
            content = page.content()
            print(content)

        finally:
            server.terminate()
            browser.close()

if __name__ == "__main__":
    debug_content()
