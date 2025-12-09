from playwright.sync_api import sync_playwright

def verify_logo():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            # Navigate to the local server
            page.goto('http://localhost:8080')

            # Wait for the logo to appear
            # The logo has class 'header-logo'
            logo_locator = page.locator('.header-logo')
            logo_locator.wait_for(state='visible')

            # Take a screenshot of the entire page
            page.screenshot(path='verification/new_logo_verification.png', full_style=True)
            print("Screenshot taken successfully")
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_logo()
