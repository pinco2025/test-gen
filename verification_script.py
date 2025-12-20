from playwright.sync_api import sync_playwright
import os
import subprocess
import time
import sys

def test_question_editor_rendering():
    # Start HTTP server
    server = subprocess.Popen([sys.executable, "-m", "http.server", "8000", "--directory", "dist"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    print("HTTP Server started on port 8000")

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page()

            # Inject Mock API
            page.add_init_script("""
                window.electronAPI = {
                    db: {
                        connect: () => Promise.resolve({ success: true }),
                        isConnected: () => Promise.resolve(true),
                        getTypes: () => Promise.resolve(['MCQ', 'Integer']),
                        getYears: () => Promise.resolve(['2024']),
                        getTags: () => Promise.resolve(['Tag1']),
                        getChaptersByType: () => Promise.resolve({}),
                    },
                    questions: {
                        getAll: () => Promise.resolve([]),
                        search: () => Promise.resolve([]),
                        createQuestion: () => Promise.resolve(true),
                        saveSolution: () => Promise.resolve(true),
                    },
                    project: {
                        list: () => Promise.resolve([]),
                        getConfig: () => Promise.resolve({ theme: 'light' }),
                    },
                    on: (channel, func) => {},
                    off: (channel, func) => {},
                    invoke: (channel, ...args) => Promise.resolve()
                };
            """)

            page.goto("http://localhost:8000")
            page.wait_for_timeout(2000)

            # Click "Add Question" button (assuming it exists in header)
            # Try finding it by icon or text
            try:
                # Look for the "add_circle" icon button usually in the header
                # We can try to select by class or hierarchy if needed, but text/role is better.
                # In TitleBar.tsx/Header, there might be a button.

                # If we can't find it, we might be on a landing page that requires project selection.
                # The mock returns empty projects list, so it might show "Welcome" or "Create Project".

                # Let's check if we are on Landing Page
                if page.get_by_text("Select a Project").is_visible() or page.get_by_text("Create New Project").is_visible():
                    print("On Landing Page. Creating dummy project...")
                    # Click Create Project
                    page.get_by_text("Create New Project").click()
                    # Fill form
                    page.get_by_placeholder("Project Name").fill("Test Project")
                    page.get_by_role("button", name="Create Project").click()
                    page.wait_for_timeout(1000)

                # Now we should be on Dashboard.
                # Find Add Question button.
                # It usually has text "Add Question" or just an icon.
                # Let's try generic selector for the button in the top right area.

                # Try to trigger the modal via console if UI interaction is hard to guess
                # But we want to test the UI.

                # Let's try to find the button with 'add' icon
                btns = page.locator('button span.material-symbols-outlined')
                add_btn = None
                for i in range(btns.count()):
                    if 'add' in btns.nth(i).inner_text() or 'add_circle' in btns.nth(i).inner_text():
                        add_btn = btns.nth(i).locator('..') # Parent button
                        break

                if add_btn:
                    add_btn.click()
                else:
                    # Fallback: try text
                    page.get_by_text("Add New Question").click()

                page.wait_for_timeout(1000)

                # Check if modal is open
                if page.get_by_text("JSON Input").is_visible():
                    print("Modal opened.")

                    # Fill textarea
                    # "question": "Line 1 \\n Line 2 \\\\text{latex}"
                    # We use single backslash for \n, so in Python string it is escaped as \\n
                    # We want literal \n in the input box.
                    json_content = '''{
                        "question": "Line 1 \\\\n Line 2 \\\\\\\\text{latex}",
                        "answer": "A",
                        "type": "MCQ"
                    }'''

                    # Wait, if I type \n in the box, it means literal backslash n.
                    # My verification aim:
                    # Input: "Line 1 \n Line 2" (literal \n)
                    # Expected Render: Line break.

                    # In python string: "Line 1 \\n Line 2".

                    page.locator('.npm__react-simple-code-editor__textarea').fill(json_content)

                    # Click Generate Preview
                    page.get_by_text("Generate Preview").click()
                    page.wait_for_timeout(1000)

                    page.screenshot(path='/home/jules/verification/final_render.png')
                    print("Screenshot taken.")

                else:
                    print("Modal did not open.")
                    page.screenshot(path='/home/jules/verification/failed_modal.png')

            except Exception as e:
                print(f"Test error: {e}")
                page.screenshot(path='/home/jules/verification/error.png')

    finally:
        server.kill()

if __name__ == "__main__":
    test_question_editor_rendering()
