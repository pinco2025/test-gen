from playwright.sync_api import sync_playwright, expect
import os

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock the window.electronAPI since we are in a web browser, not Electron
        page.add_init_script("""
            window.electronAPI = {
                config: {
                    get: () => Promise.resolve({ chaptersPath: null, databasePath: null }),
                    update: () => Promise.resolve({ success: true }),
                    deleteAllProjects: () => Promise.resolve({ success: true, count: 0 })
                },
                db: {
                    connect: () => Promise.resolve({ success: false }),
                    isConnected: () => Promise.resolve(false),
                    selectFile: () => Promise.resolve({ success: true, path: '/mock/path/to/db.sqlite' })
                },
                chapters: {
                    load: () => Promise.resolve(null),
                    selectFile: () => Promise.resolve({ success: true, path: '/mock/path/to/chapters.json' })
                },
                project: {
                    list: () => Promise.resolve([]),
                },
                questions: {
                     getAll: () => Promise.resolve([]),
                     getAllForSubject: () => Promise.resolve([]),
                }
            };
        """)

        # Navigate to the app
        page.goto("http://localhost:8000")

        # Expect Landing Page
        expect(page.get_by_text("Welcome")).to_be_visible()

        # Click "Test Generation System" card to enter the test gen mode
        page.get_by_text("Test Generation System").last.click()

        # Wait for the database connect screen to appear
        expect(page.get_by_text("Please connect to a question database and select a chapters file to begin.")).to_be_visible()

        # Take a screenshot of the initial state (DB connect screen)
        page.screenshot(path="verification/initial_connect_state.png")
        print("Initial connect state screenshot captured.")

        # Check for the "Select Chapters File" button
        select_chapters_btn = page.get_by_role("button", name="Select Chapters File")
        expect(select_chapters_btn).to_be_visible()

        # Simulate clicking the button (in a real Electron app this opens a dialog, here it triggers our mock)
        select_chapters_btn.click()

        # Since we mocked the API to return success, the UI should update
        # The button text should change to "Change Chapters File"

        expect(page.get_by_role("button", name="Change Chapters File")).to_be_visible()

        # Take a screenshot of the connected state
        page.screenshot(path="verification/connected_state.png")
        print("Connected state screenshot captured.")

        browser.close()

if __name__ == "__main__":
    run()
