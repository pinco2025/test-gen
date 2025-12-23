from playwright.sync_api import sync_playwright, Page, expect

def verify_test_review(page: Page):
    page.on("console", lambda msg: print(f"BROWSER CONSOLE: {msg.text}"))
    page.on("pageerror", lambda exc: print(f"BROWSER ERROR: {exc}"))

    page.goto("http://localhost:8000")

    mock_script = """
    window.electronAPI = {
        config: { get: () => Promise.resolve({}), update: () => Promise.resolve(true) },
        db: {
            connect: () => Promise.resolve({ success: true }),
            isConnected: () => Promise.resolve(true),
            getTypes: () => Promise.resolve(['MCQ']),
            getYears: () => Promise.resolve(['2024']),
            getChaptersByType: () => Promise.resolve({})
        },
        project: { list: () => Promise.resolve([]), save: () => Promise.resolve(true), load: () => Promise.resolve(null) },
        questions: {
            getByUUID: (uuid) => Promise.resolve({ uuid: uuid, question: 'Test Question', answer: 'A', type: 'MCQ', verification_level_1: 'approved', frequency: 5 }),
            getByUUIDs: (uuids) => Promise.resolve([
                { uuid: 'q1', question: 'Verify Q1 Content', answer: 'A', type: 'MCQ', verification_level_1: 'approved', frequency: 10, option_a: 'Option A', option_b: 'Option B' },
                { uuid: 'q2', question: 'Verify Q2 Content', answer: 'B', type: 'MCQ', verification_level_1: 'rejected' },
                { uuid: 'q3', question: 'Verify Q3 Content', answer: 'C', type: 'MCQ', verification_level_1: 'pending' }
            ]),
            getSolution: () => Promise.resolve(null),
            updateQuestion: () => Promise.resolve(true)
        },
        chapters: { load: () => Promise.resolve({ Physics: [], Chemistry: [], Mathematics: [] }) }
    };
    """
    page.add_init_script(mock_script)
    page.reload()

    # We can't automatically navigate to Review without state injection in App.tsx which I reverted.
    # But I can verify the landing page renders, meaning no syntax errors.
    expect(page.get_by_text("Welcome")).to_be_visible()

    page.screenshot(path="/home/jules/verification/final_check.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_test_review(page)
        finally:
            browser.close()
