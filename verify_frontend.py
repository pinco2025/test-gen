from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1920, "height": 1080})
        context.grant_permissions(['clipboard-read', 'clipboard-write'])
        page = context.new_page()

        page.goto("http://localhost:8000")

        # Mock the window.electronAPI
        page.add_init_script("""
            window.electronAPI = {
                config: {
                    get: () => Promise.resolve({ databasePath: '/mock/path.db' }),
                    update: () => Promise.resolve({ success: true }),
                    deleteAllProjects: () => Promise.resolve({ success: true, count: 0 })
                },
                db: {
                    connect: () => Promise.resolve({ success: true }),
                    isConnected: () => Promise.resolve(true),
                    selectFile: () => Promise.resolve({ success: true, path: '/mock/path.db' }),
                    getTypes: () => Promise.resolve(['Physics', 'Chemistry']),
                    getYears: () => Promise.resolve(['2024', '2023']),
                    getChaptersByType: () => Promise.resolve({
                        'physics': ['PHY01', 'PHY02'],
                        'chemistry': ['CHE01']
                    }),
                    getTags: () => Promise.resolve([])
                },
                project: {
                    list: () => Promise.resolve([]),
                    load: () => Promise.resolve(null),
                    save: () => Promise.resolve({ success: true }),
                    delete: () => Promise.resolve({ success: true }),
                    exists: () => Promise.resolve(false)
                },
                questions: {
                    getAllForSubject: () => Promise.resolve([
                        {
                            uuid: 'q1',
                            question: 'Sample Question',
                            answer: 'A',
                            type: 'MCQ',
                            verification_level_1: 'pending',
                            verification_level_2: 'pending',
                            topic_tags: '["Topic1"]',
                            jee_mains_relevance: 3
                        }
                    ]),
                    getSolution: () => Promise.resolve({
                        uuid: 'q1',
                        solution_text: 'Solution text',
                        solution_image_url: ''
                    }),
                    updateQuestion: () => Promise.resolve(true),
                    saveSolution: () => Promise.resolve(true)
                },
                window: {
                    minimize: () => Promise.resolve(),
                    maximize: () => Promise.resolve(),
                    close: () => Promise.resolve()
                }
            };
        """)

        page.reload()
        page.wait_for_timeout(2000)

        # 1. Start at Dashboard
        page.screenshot(path="/home/jules/verification/step1_initial.png")

        # 2. Click "Database Tagging & Cleaning" in the landing page
        # Based on screenshot step1, it's a card.
        # "Database Tagging & Cleaning" text is visible in the card.
        try:
             # Find the text "Database Tagging & Cleaning" which is inside an h3 or div
             page.get_by_text("Database Tagging & Cleaning", exact=True).click()
        except:
             print("Could not find/click Database Cleaning card")

        page.wait_for_timeout(2000)
        page.screenshot(path="/home/jules/verification/step2_mode.png")

        # 3. Now in Database Cleaning.
        # Find the question. It's rendered.
        # Click "Actions" button.

        # Actions button has title "Actions"
        page.get_by_title("Actions").first.click()

        # Wait for menu
        page.wait_for_timeout(500)

        # Click "Edit Properties"
        page.get_by_text("Edit Properties").click()

        page.wait_for_timeout(1000)
        page.screenshot(path="/home/jules/verification/step3_edit_modal.png")

        # Verify fields
        tags_label = page.get_by_text("Topic Tags (JSON Array)")
        if tags_label.is_visible():
            print("Topic Tags field found!")

        v1_label = page.get_by_text("Verification Level 1")
        if v1_label.is_visible():
            print("Verification Level 1 field found!")

        # Take final screenshot
        page.screenshot(path="/home/jules/verification/question_editor_new_fields.png")

        browser.close()

if __name__ == "__main__":
    verify_frontend()
