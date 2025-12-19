from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock the window.electronAPI with data
        page.add_init_script("""
            window.electronAPI = {
                on: () => {},
                off: () => {},
                removeListener: () => {},
                db: {
                    connect: () => Promise.resolve(true),
                    checkConnection: () => Promise.resolve(true),
                    getTypes: () => Promise.resolve(['MCQ', 'Numerical']),
                    getYears: () => Promise.resolve(['2024', '2023']),
                    getChaptersByType: () => Promise.resolve({ 'Physics': ['P01', 'P02'] }),
                    getQuestions: () => Promise.resolve([])
                },
                questions: {
                   getAllForSubject: () => Promise.resolve([
                       {
                           uuid: 'q1',
                           question: 'Test Question',
                           answer: 'A',
                           type: 'MCQ',
                           year: '2024',
                           tag_1: 'Topic',
                           tag_2: 'P01',
                           tag_3: 'M',
                           option_a: 'Opt A',
                           option_b: 'Opt B',
                           option_c: 'Opt C',
                           option_d: 'Opt D',
                           created_at: new Date().toISOString(),
                           updated_at: new Date().toISOString(),
                           frequency: 0
                       }
                   ]),
                   getByChapterCodes: () => Promise.resolve([]),
                   getSolution: () => Promise.resolve({ uuid: 'q1', solution_text: 'Sol', solution_image_url: '' }),
                   createQuestion: () => Promise.resolve(true),
                   updateQuestion: () => Promise.resolve(true),
                   saveSolution: () => Promise.resolve(true),
                   incrementFrequency: () => Promise.resolve(),
                   decrementFrequency: () => Promise.resolve()
                }
            };
        """)

        try:
            # 1. Go to the main page
            page.goto("http://localhost:8000")
            print("Loaded page")
            page.wait_for_timeout(2000)

            # 2. Navigate to Database Cleaning
            db_card = page.get_by_text("Database Tagging & Cleaning")
            if db_card.count() > 0:
                db_card.click()
                print("Clicked Database Tagging & Cleaning")
                page.wait_for_timeout(1000)
                page.screenshot(path="/home/jules/verification/cleaning_view.png")
            else:
                print("Database Tagging & Cleaning card not found!")
                page.screenshot(path="/home/jules/verification/landing_fail.png")
                return

            # 3. Navigate to Question List (Click a chapter)
            # Try finding any button inside the grid
            chapter_btn = page.locator(".grid button").first
            if chapter_btn.count() > 0:
                chapter_btn.click()
                print("Clicked a chapter")
                page.wait_for_timeout(1000)
                page.screenshot(path="/home/jules/verification/question_list.png")
            else:
                print("No chapter buttons found!")
                # Debug screenshot
                page.screenshot(path="/home/jules/verification/no_chapters.png")
                return

            # 4. Verify Filter Button
            # Look for button with text "Filters"
            filter_btn = page.get_by_role("button", name="Filters")
            if filter_btn.count() == 0:
                 filter_btn = page.get_by_text("Filters")

            if filter_btn.is_visible():
                print("Filter button is visible.")
            else:
                print("Filter button NOT visible.")
                if page.locator("span.material-symbols-outlined").filter(has_text="filter_list").is_visible():
                     print("Filter icon found.")

            # 5. Enter Edit Mode
            # Find the "Edit" button for the first question.
            # Using standard material icon selector
            edit_icon = page.locator("span.material-symbols-outlined").filter(has_text="edit").first
            if edit_icon.count() > 0:
                edit_icon.click()
                print("Clicked Edit Icon")
                page.wait_for_timeout(1000)

                # 6. Verify Editor Changes
                found_legacy = page.get_by_text("Legacy Images").is_visible()
                print(f"Legacy Images section: {'Found' if found_legacy else 'Not Found'}")

                found_tag2 = page.get_by_text("Chapter Code (Tag 2)").is_visible()
                print(f"Chapter Code (Tag 2): {'Found' if found_tag2 else 'Not Found'}")

                found_tag3 = page.get_by_text("Difficulty (Tag 3)").is_visible()
                print(f"Difficulty (Tag 3): {'Found' if found_tag3 else 'Not Found'}")

                page.screenshot(path="/home/jules/verification/editor_view.png")

            else:
                print("Edit button not found.")
                page.screenshot(path="/home/jules/verification/list_view_no_edit.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="/home/jules/verification/error.png")
        finally:
            browser.close()

run()
