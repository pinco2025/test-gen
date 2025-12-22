from playwright.sync_api import sync_playwright, expect
import time

def verify_full_test_creation():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        try:
            # Navigate to the app (running on port 8000)
            page.goto("http://localhost:8000")

            # Add Mock API
            page.add_init_script("""
                window.electronAPI = {
                    config: {
                        get: () => Promise.resolve({ databasePath: '/tmp/test.db', chaptersPath: '/tmp/chapters.json' }),
                        update: () => Promise.resolve(true),
                        deleteAllProjects: () => Promise.resolve(0)
                    },
                    db: {
                        connect: () => Promise.resolve({ success: true }),
                        isConnected: () => Promise.resolve(true),
                        selectFile: () => Promise.resolve({ success: true, path: '/tmp/test.db' }),
                        getChaptersByType: () => Promise.resolve({ Physics: [], Chemistry: [], Mathematics: [] })
                    },
                    chapters: {
                        load: () => Promise.resolve({ Physics: [], Chemistry: [], Mathematics: [] }),
                        selectFile: () => Promise.resolve({ success: true, path: '/tmp/chapters.json' })
                    },
                    project: {
                        list: () => Promise.resolve([]),
                        load: () => Promise.resolve(null),
                        save: () => Promise.resolve(true),
                        exists: () => Promise.resolve(false),
                        delete: () => Promise.resolve(true)
                    },
                    questions: {
                        getCount: () => Promise.resolve(100),
                        createQuestion: () => Promise.resolve(true),
                        saveSolution: () => Promise.resolve(true),
                        updateQuestion: () => Promise.resolve(true),
                        getByUUID: () => Promise.resolve(null)
                    }
                };
            """)
            page.reload()

            # Wait for Landing Page
            expect(page.get_by_text("Welcome")).to_be_visible()

            # Click "Test Generation System" card
            # The card has title "Test Generation System"
            # There might be multiple elements with this text (header and card)
            # The card is likely a div or button.
            # Let's target the card specifically. It's likely the first one or we can search by text inside the card.
            page.get_by_text("Create, configure, and export practice tests").click() # Clicking description to be safe or the heading above it

            # Wait for Dashboard
            # If DB is connected (mock says yes), it should go to dashboard
            # It might ask to select DB if logic in App.tsx checks strictly.
            # App.tsx:
            # if (config.databasePath) setDbConnected(true) ...
            # The mock returns databasePath, so it should be connected.

            try:
                page.wait_for_selector("text=Welcome back, Admin!", timeout=5000)
            except:
                print("Dashboard not reached. Checking...")
                page.screenshot(path="verification/debug_state_2.png")
                if page.get_by_text("Select Database File").is_visible():
                     # Mock connect
                     page.get_by_text("Select Database File").click()
                     # Mock chapters if needed
                if page.get_by_text("Select Chapters File").is_visible():
                     page.get_by_text("Select Chapters File").click()

                page.wait_for_selector("text=Welcome back, Admin!", timeout=5000)

            # Take screenshot of Dashboard Home (Should see Full Tests / Part Tests buttons)
            page.screenshot(path="verification/2_dashboard_home.png")

            # Verify Full Tests button exists
            expect(page.get_by_text("Full Tests")).to_be_visible()
            expect(page.get_by_text("Part Tests")).to_be_visible()

            # Click "Full Tests"
            page.get_by_text("Full Tests").click()

            # Verify Full Tests List view
            page.screenshot(path="verification/3_full_tests_list.png")
            expect(page.get_by_text("Create New Full Test")).to_be_visible()

            # Click Create New Full Test
            page.get_by_text("Create New Full Test").click()

            # Verify JSON Upload screen
            page.screenshot(path="verification/4_upload_screen.png")
            expect(page.get_by_text("Upload Test Matrix")).to_be_visible()

            # OPTIONAL: Test File Upload
            # We can create a dummy JSON file and upload it
            # But the file input is hidden. We need to set input files.

            print("Verification script completed successfully!")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_full_test_creation()
