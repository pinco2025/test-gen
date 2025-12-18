from playwright.sync_api import sync_playwright, expect
import time

def verify_new_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (Landing Page)
        page.goto("http://localhost:8080")
        time.sleep(1) # wait for render

        # 1. Verify Landing Page
        print("Verifying Landing Page...")
        expect(page.get_by_role("heading", name="Welcome")).to_be_visible()
        expect(page.get_by_role("button", name="Test Generation System")).to_be_visible()
        expect(page.get_by_role("button", name="Database Tagging & Cleaning")).to_be_visible()

        page.screenshot(path="verification_landing.png")
        print("Captured verification_landing.png")

        # 2. Navigate to Database Cleaning
        print("Navigating to Database Cleaning...")
        page.get_by_role("button", name="Database Tagging & Cleaning").click()

        time.sleep(1) # wait for render

        # 3. Verify Database Cleaning Page
        print("Verifying Database Cleaning Page...")
        # Since we are not connected to DB, it should show the "Select Database" screen initially?
        # App.tsx:
        # if (appMode === 'database-cleaning') {
        #    if (!dbConnected) { ... return Connect Screen ... }
        # }

        # Let's verify we see "Database Cleaning" title in the connect screen
        expect(page.get_by_role("heading", name="Database Cleaning")).to_be_visible()
        expect(page.get_by_text("Please connect to a question database to begin")).to_be_visible()

        page.screenshot(path="verification_cleaning_connect.png")
        print("Captured verification_cleaning_connect.png")

        # NOTE: We cannot easily verify the actual question list without mocking the DB connection
        # via Electron API. Since we are running in a static server, window.electronAPI is undefined.
        # But we verified the routing to the new section.

        # 4. Go Back to Home (Landing Page)
        # The header should have a Home button
        print("Navigating back to Home...")
        # The home button in header
        page.locator("button[title='Back to Home']").click()
        time.sleep(1)

        expect(page.get_by_role("heading", name="Welcome")).to_be_visible()
        page.screenshot(path="verification_back_to_landing.png")
        print("Captured verification_back_to_landing.png")

        browser.close()

if __name__ == "__main__":
    verify_new_flow()
