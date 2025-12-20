from playwright.sync_api import sync_playwright

def verify_features(page):
    print("Navigating to app...")
    page.goto("http://localhost:8000")

    # Wait for the app to load
    page.wait_for_timeout(2000)

    # Check for Verification Buttons
    print("Checking for Verification Level 1 buttons...")
    # These might be below the fold, need to scroll the right pane
    # The right pane is section.lg:col-span-7 > div.flex-1.overflow-y-auto

    # Scroll down
    try:
        page.locator("section.lg\\:col-span-7 div.flex-1.overflow-y-auto").evaluate("node => node.scrollTop = 1000")
        page.wait_for_timeout(500)
    except Exception as e:
        print(f"Scroll failed: {e}")

    if page.locator("button[title='Approve']").count() > 0:
        print("SUCCESS: Found Approve button")
    else:
        print("ERROR: Approve button not found")

    if page.locator("button[title='Pending']").count() > 0:
        print("SUCCESS: Found Pending button")
    else:
        print("ERROR: Pending button not found")

    # Check Undo/Redo
    print("Checking Undo/Redo on Question Text...")
    # Scroll back up
    page.locator("section.lg\\:col-span-7 div.flex-1.overflow-y-auto").evaluate("node => node.scrollTop = 0")
    page.wait_for_timeout(500)

    question_area = page.locator("textarea").first
    question_area.click()

    # Clear and type
    question_area.fill("Step 1")
    page.wait_for_timeout(200)
    # Type more (simulate distinct actions if possible, but fill replaces content.
    # To trigger history with useUndoRedo, we rely on state updates. fill() triggers change events.)

    question_area.fill("Step 2")
    page.wait_for_timeout(200)

    print(f"Current Value: {question_area.input_value()}")

    # Undo
    print("Sending Ctrl+Z...")
    question_area.press("Control+z")
    page.wait_for_timeout(200)
    val_undo = question_area.input_value()
    print(f"Value after Undo: {val_undo}")

    if val_undo == "Step 1":
        print("SUCCESS: Undo worked (Step 2 -> Step 1)")
    else:
        print(f"FAILURE: Undo did not revert to 'Step 1', got '{val_undo}'")

    # Redo
    print("Sending Ctrl+Y...")
    question_area.press("Control+y")
    page.wait_for_timeout(200)
    val_redo = question_area.input_value()
    print(f"Value after Redo: {val_redo}")

    if val_redo == "Step 2":
        print("SUCCESS: Redo worked (Step 1 -> Step 2)")
    else:
        print(f"FAILURE: Redo did not restore 'Step 2', got '{val_redo}'")

    page.screenshot(path="verification_features.png")
    print("Screenshot saved to verification_features.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_features(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()
