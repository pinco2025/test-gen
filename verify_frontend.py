from playwright.sync_api import Page, expect, sync_playwright

def verify_question_editor(page: Page):
    # Mock window.electronAPI with more complete mocks including isConnected and db.connect
    page.add_init_script("""
        window.electronAPI = {
            db: {
                connect: () => Promise.resolve({ success: true }),
                isConnected: () => Promise.resolve(true),
                getTypes: () => Promise.resolve(['MCQ', 'Numerical']),
                getYears: () => Promise.resolve(['2023', '2022']),
                getChaptersByType: () => Promise.resolve({
                    'physics': ['PHY01', 'PHY02'],
                    'chemistry': ['CHE01', 'CHE02']
                })
            },
            chapters: {
                addTopic: (subject, chapter, topic) => Promise.resolve({
                    success: true,
                    topicId: '999',
                    topicName: topic
                })
            },
            questions: {
                getSolution: () => Promise.resolve({
                    uuid: 'q1',
                    solution_text: 'Sample solution',
                    solution_image_url: null
                }),
                getAllForSubject: () => Promise.resolve([
                    {
                        uuid: 'q1',
                        question: 'Test Question',
                        type: 'MCQ',
                        tag_2: 'VEP',
                        answer: 'A',
                        scary: false,
                        calc: false,
                        option_a: 'Option A',
                        option_b: 'Option B',
                        option_c: 'Option C',
                        option_d: 'Option D'
                    }
                ]),
                updateQuestion: () => Promise.resolve(true)
            }
        };
    """)

    # 1. Navigate to the app
    # Start at Database Cleaning mode by simulating the Landing Page selection
    # Or navigate directly if possible. Since hash routing is used.
    page.goto("http://localhost:8000/")

    # Wait for the app to load
    page.wait_for_timeout(2000)

    # Click "Database Tagging & Cleaning" on Landing Page
    page.get_by_text("Database Tagging & Cleaning").click()
    page.wait_for_timeout(1000)

    # In DatabaseCleaning.tsx, there's a check for activeChapterCode.
    # Initially it is null, so it shows Chapter Selection Grid.

    # But wait, it also seems to require a database connection?
    # The screenshot showed "Database Cleaning - Please connect...".
    # My mock isConnected returns true, but maybe the state in App.tsx needs to be updated.
    # In App.tsx, it likely checks isConnected on mount.
    # Since I inject the script before load, it should be fine.

    # However, if the app starts in Landing Page, and then we click "Database Tagging & Cleaning",
    # the App component switches appMode.

    # If the screenshot showed "Disconnected", it means dbService.isConnected() returned false or wasn't checked.
    # My mock should fix that.

    # Let's assume we are on the chapter grid now.
    # We need to select a subject. Default is Physics.
    # We need to click a chapter. "Vector Algebra" code is "VEP".

    # Find "Vector Algebra" and click
    try:
        page.get_by_text("Vector Algebra").click(timeout=5000)
    except:
        # Fallback if "Vector Algebra" isn't found (maybe different chapter data loaded)
        page.locator(".grid > button").first.click()

    page.wait_for_timeout(2000)

    # Now we should see the question list.
    # Click "Test Question" (from our mock).
    # It might be rendered in a QuestionRow.

    page.get_by_text("Test Question").first.click()
    page.wait_for_timeout(2000)

    # Now we are in QuestionEditor.

    # Verify Checkboxes
    expect(page.get_by_label("Difficult from view")).to_be_visible()
    expect(page.get_by_label("Calculation Intensive")).to_be_visible()

    # Verify Clear Newlines Button
    expect(page.locator("button[title='Clear Newlines (\\n)']").first).to_be_visible()

    # Verify Floating Text Menu
    textarea = page.locator("textarea").first
    textarea.fill("Some text")
    textarea.select_text()
    textarea.dispatch_event("mouseup")
    page.wait_for_timeout(1000)

    expect(page.get_by_text("1271", exact=True)).to_be_visible()

    page.screenshot(path="/home/jules/verification/verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_question_editor(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
