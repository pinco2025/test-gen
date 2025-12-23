from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_frontend(page: Page):
    print("Navigating to app...")
    page.goto("http://localhost:8000")

    # Wait for the app to load (Landing Page)
    # The new UI shows "Database Tagging & Cleaning" or "Test Generation System"
    # Assuming initial state is Landing Page, checking for "Create New Test" or "Full Test" cards

    print("Waiting for landing page...")
    # This might fail if the mock API isn't handling initialization,
    # but since we are serving static files, it might just show the 'database-connect' screen
    # because useEffect will fail to connect to backend.

    # Let's take a screenshot of whatever state it is in.
    # Ideally we'd want to see the changes in QuestionSelection, but that requires complex state setup
    # which is hard without a backend.
    # However, we can verify that the app loads and renders *something* without crashing.

    time.sleep(2) # Give it a moment to render React

    page.screenshot(path="/home/jules/verification/frontend_verification.png")
    print("Screenshot taken.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_frontend(page)
        finally:
            browser.close()
