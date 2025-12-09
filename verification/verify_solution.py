from playwright.sync_api import Page, expect, sync_playwright

def verify_solution_modal(page: Page):
    # Inject mock electronAPI
    page.add_init_script("""
        window.electronAPI = {
            config: {
                get: async () => ({ databasePath: '/mock/path/db.sqlite', lastProjectId: null }),
                update: async () => ({ success: true }),
                deleteAllProjects: async () => ({ success: true, count: 0 })
            },
            db: {
                connect: async () => ({ success: true }),
                isConnected: async () => true,
                selectFile: async () => ({ success: true, path: '/mock/path/db.sqlite' }),
                getTypes: async () => ['Physics', 'Chemistry', 'Mathematics'],
                getYears: async () => ['2023'],
                getTags: async () => ['Tag1'],
                getChaptersByType: async () => ({
                   'physics': ['PHW'],
                   'chemistry': ['SBC'],
                   'mathematics': ['SET']
                })
            },
            project: {
                list: async () => [],
                exists: async () => false,
                save: async () => ({ success: true }),
                load: async () => null,
                delete: async () => ({ success: true })
            },
            questions: {
                updateQuestion: async () => true,
                getSolution: async (uuid) => {
                    return { uuid, solution_text: 'Existing solution text with $LaTeX$', solution_image_url: 'http://example.com/sol.png' };
                },
                saveSolution: async (uuid, text, img) => {
                    return true;
                },
                getByChapterCodes: async () => {
                    return [{
                        uuid: 'q1',
                        question: 'Test Question 1 $x^2$',
                        question_image_url: null,
                        option_a: 'A', option_a_image_url: null,
                        option_b: 'B', option_b_image_url: null,
                        option_c: 'C', option_c_image_url: null,
                        option_d: 'D', option_d_image_url: null,
                        answer: 'A',
                        type: 'Physics',
                        year: '2023',
                        tag_1: 'Tag1', tag_2: 'PHW', tag_3: 'Easy', tag_4: 'Tag4',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        frequency: 0
                    }];
                },
                incrementFrequency: async () => true
            },
            test: {
                export: async () => ({ success: true, path: '/tmp/test.json' })
            }
        };
        console.log("Mock ElectronAPI injected");
    """)

    page.on("console", lambda msg: print(f"Console: {msg.text}"))

    # Open the app
    page.goto("http://localhost:5173")

    # 1. Dashboard -> Create New Project
    try:
        page.get_by_text("Create New Project").click(timeout=5000)
    except:
        print("Could not find 'Create New Project' text. Trying locator.")
        page.locator('.project-tile-new').click()

    # 2. Test Creation Form
    page.fill('input[placeholder="e.g., JEE-2024-01"]', "TEST-SOL-001")
    page.fill('textarea[placeholder="Brief description of the test"]', "Test with Solution")

    # Select Chapters
    page.locator('label[title="PHW"]').click()
    page.locator('label[title="SBC"]').click()
    page.locator('label[title="SET"]').click()

    page.get_by_role("button", name="Continue to Section Configuration").click()

    # 3. Section Config (Physics)
    page.get_by_role("button", name="Continue to Question Selection").click()

    # 4. Question Selection (Physics)
    # Wait for loading to finish
    page.wait_for_selector('.selectable-question')
    # Click the question row to select
    page.locator('.selectable-question').first.click()

    # Button to next section is "Continue to Next Section"
    page.get_by_text("Continue to Next Section").click()

    # 5. Section Config (Chemistry) -> Selection -> Next
    page.get_by_role("button", name="Continue to Question Selection").click()
    page.get_by_text("Continue to Next Section").click()

    # 6. Section Config (Math) -> Selection -> Next
    page.get_by_role("button", name="Continue to Question Selection").click()
    page.get_by_text("Continue to Next Section").click()

    # Wait, the button text depends on validity.
    # If selection is not valid (not 25 questions), the button is disabled.
    # "Need 19 more for Div1, 5 more for Div2"
    # I cannot proceed unless I select 25 questions!
    # This is a problem for quick verification.

    # I can mock `isSelectionValid` check or select 25 times?
    # Or I can jump to Test Review via mock state injection?
    # No easy way to jump state.

    # I should modify `QuestionSelection.tsx` to allow proceeding for testing/dev?
    # Or just mock `isSelectionValid` to always be true in `QuestionSelection`?
    # I can use `page.evaluate` to force enable the button?
    # Button has `disabled={!isSelectionValid}`.
    # Removing `disabled` attribute might work if the `onClick` handler doesn't check validity again.
    # `onClick={() => onComplete(selectedQuestions)}`. It doesn't check validity.
    # So I can force enable the button.

    # Let's add that to script.

    # 4. Question Selection (Physics)
    page.wait_for_selector('.selectable-question')
    page.locator('.selectable-question').first.click()

    # Force enable button
    page.evaluate("document.querySelector('.selection-actions .btn-primary').disabled = false")
    page.locator('.selection-actions .btn-primary').click()

    # 5. Section Config (Chemistry)
    page.get_by_role("button", name="Continue to Question Selection").click()
    # Force enable button (skip selection)
    page.wait_for_selector('.selection-actions .btn-primary') # Wait for button to exist
    page.evaluate("document.querySelector('.selection-actions .btn-primary').disabled = false")
    page.locator('.selection-actions .btn-primary').click()

    # 6. Section Config (Math)
    page.get_by_role("button", name="Continue to Question Selection").click()
    # Force enable button
    page.wait_for_selector('.selection-actions .btn-primary')
    page.evaluate("document.querySelector('.selection-actions .btn-primary').disabled = false")
    page.locator('.selection-actions .btn-primary').click()

    # 7. Test Review
    expect(page.get_by_text("Review Test")).to_be_visible()

    # 8. Open Solution Modal
    page.get_by_role("button", name="Solution").click()

    # 9. Verify Modal
    expect(page.get_by_role("heading", name="Add Solution")).to_be_visible()
    textarea = page.locator('textarea[placeholder="Enter solution explanation..."]')
    expect(textarea).to_have_value('Existing solution text with $LaTeX$')

    # 10. Verify Preview
    expect(page.locator('.preview-container')).to_contain_text("Existing solution text")

    # 11. Screenshot
    page.screenshot(path="/home/jules/verification/solution_modal.png")

    # 12. Modify and Save
    textarea.fill("Updated solution text")
    page.get_by_role("button", name="Save Solution").click()
    expect(page.get_by_role("heading", name="Add Solution")).not_to_be_visible()

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_solution_modal(page)
            print("Verification successful!")
        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()
