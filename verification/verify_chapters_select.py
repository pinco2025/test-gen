from playwright.sync_api import sync_playwright, expect
import os
import subprocess
import time
import sys

def test_chapters_select():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

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

            # Select Database
            page.click("text=Select Database File")
            page.wait_for_timeout(500)

            # Select Chapters
            page.click("text=Select Chapters File")
            page.wait_for_timeout(500)

            # Now we expect to be on the dashboard
            # Look for "Welcome back, Admin!" and "Available Projects"
            expect(page.get_by_text("Welcome back, Admin!")).to_be_visible()
            expect(page.get_by_text("Available Projects")).to_be_visible()

            page.screenshot(path="verification/dashboard_final_state.png")
            print("Dashboard state screenshot taken")

        finally:
            server.terminate()
            browser.close()

if __name__ == "__main__":
    test_chapters_select()
