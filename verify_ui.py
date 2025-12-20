from playwright.sync_api import sync_playwright

def verify_multi_concept(page):
    print("Navigating to app...")
    page.goto("http://localhost:8000")

    # Wait for the app to load
    page.wait_for_timeout(2000)

    # We should be in edit-question mode now.

    print("Checking for removal of Multi-Concept checkbox...")
    if page.locator("#is_multi_concept").count() > 0:
        print("ERROR: Multi-Concept checkbox is still visible!")
    else:
        print("SUCCESS: Multi-Concept checkbox is gone.")

    print("Checking for Additional Topics UI...")
    # There is a checkbox "Additional Topics"
    try:
        # Looking for label text "Additional Topics" or checkbox id "show_additional_topics"
        # The code uses id="show_additional_topics"

        checkbox = page.locator("#show_additional_topics")
        if checkbox.count() > 0:
            print("Found 'Additional Topics' checkbox.")
            if not checkbox.is_checked():
                print("Checking it...")
                checkbox.check()
                page.wait_for_timeout(500)

            # Now dropdowns should appear
            # We expect selects for Subject, Chapter, Topic
            selects = page.locator("select")
            count = selects.count()
            print(f"Found {count} select elements after enabling additional topics.")
            # Before: tag_2, tag_3, tag_1(if legacy), importance, verification1, verification2, Primary Topic, Type, Year
            # After: + AddTopicSubject, AddTopicChapter, AddTopicId

            # Take screenshot
            page.screenshot(path="verification_multi_concept_editor.png")
            print("Screenshot saved to verification_multi_concept_editor.png")
        else:
            print("ERROR: 'Additional Topics' checkbox not found.")
            page.screenshot(path="verification_error.png")

    except Exception as e:
        print(f"Error interacting with UI: {e}")
        page.screenshot(path="verification_error.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        try:
            verify_multi_concept(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="error.png")
        finally:
            browser.close()
