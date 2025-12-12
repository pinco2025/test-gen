import asyncio
from playwright.sync_api import sync_playwright, Page, expect

def create_verification_script(page: Page):
    # Go to a blank page first to ensure the init script runs before any app logic
    page.goto("about:blank")

    # Mock the electronAPI object before the page loads
    mock_electron_api = """
    window.electronAPI = {
        config: {
            get: async () => ({ databasePath: '/fake/db.sqlite' }),
            update: async () => {}
        },
        db: {
            connect: async (path) => ({ success: true, path }),
            selectFile: async () => ({ success: true, path: '/fake/db.sqlite' }),
            isConnected: async () => true,
        },
        project: {
            list: async () => ([{
                id: 'proj-1',
                testCode: 'SAMPLE-TEST',
                description: 'A sample test project',
                createdAt: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                progress: 50
            }]),
            load: async (projectId) => ({
                id: projectId,
                testMetadata: { code: 'SAMPLE-TEST', description: 'A sample test project' },
                sections: [{
                    name: 'Physics',
                    chapters: [{ code: 'PHY01', name: 'Mechanics', level: 1 }],
                    alphaConstraint: { chapters: [] },
                    betaConstraint: {},
                    selectedQuestions: []
                }],
                currentSectionIndex: 0,
                constraintConfig: { minIdx: 1, Sm: 0.1, Sh: 0.1 },
                currentStep: 'section-config-physics',
                createdAt: new Date().toISOString(),
            }),
            exists: async () => false,
            save: async () => {},
            delete: async () => {}
        },
        questions: {
            getByChapterCodes: async () => ([{
                uuid: 'uuid-1',
                question: 'This is a sample question?',
                option_a: 'Option A',
                option_b: 'Option B',
                option_c: 'Option C',
                option_d: 'Option D',
                answer: 'A',
                tag_1: 'Topic',
                tag_2: 'PHY01',
                tag_3: 'M',
                type: 'MCQ',
                year: '2023'
            }]),
            getSolution: async (uuid) => ({
                uuid,
                solution_text: 'This is the sample solution.',
                solution_image_url: ''
            }),
            updateQuestion: async () => true,
            saveSolution: async () => true,
            createQuestion: async () => true,
            decrementFrequency: async () => {},
            incrementFrequency: async () => {}
        },
        test: {
            export: async () => ({ success: true })
        }
    };
    """
    page.add_init_script(mock_electron_api)

    # Now, go to the app's URL
    page.goto("http://localhost:5173")

    # Wait for the app to be ready
    page.wait_for_selector('.dashboard')

    # 1. Dashboard should load. Click the project to open it.
    page.get_by_text("SAMPLE-TEST").click()

    # 2. Section config should load. Click the "Continue" button.
    page.locator('button:has-text("Continue to Question Selection")').click()

    # 3. Question selection should load. Click the edit button on the first question.
    page.locator('.question-row .btn-edit').first.click()

    # 4. The Question Editor should be visible.
    expect(page.get_by_text("Editing Interface")).to_be_visible()
    expect(page.get_by_text("Student Preview")).to_be_visible()

    # Take a screenshot for verification
    page.screenshot(path="verification.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            create_verification_script(page)
            print("Verification script ran successfully.")
        finally:
            browser.close()
