import subprocess
import time
import sys
from playwright.sync_api import sync_playwright

def main():
    print("Starting server...")
    server_process = subprocess.Popen([sys.executable, "-m", "http.server", "8080"], cwd=r"c:\Users\HP\Desktop\padmanabh website")
    time.sleep(2)

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            desktop_context = browser.new_context(viewport={"width": 1280, "height": 800})
            desktop_page = desktop_context.new_page()
            
            mobile_context = browser.new_context(
                viewport={"width": 390, "height": 844},
                user_agent="Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
                is_mobile=True,
                has_touch=True
            )
            mobile_page = mobile_context.new_page()

            views = [
                {'name': 'login', 'js': None},
                {'name': 'analytics', 'js': "document.querySelector('[data-target=\"tab-analytics\"]').click()"},
                {'name': 'products', 'js': "document.querySelector('[data-target=\"tab-products\"]').click()"},
                {'name': 'orders', 'js': "document.querySelector('[data-target=\"tab-orders\"]').click()"},
                {'name': 'finance', 'js': "document.querySelector('[data-target=\"tab-finance\"]').click()"}
            ]

            def capture_admin(page, prefix):
                page.goto("http://localhost:8080/")
                page.evaluate("localStorage.setItem('pa_lang', 'en');")
                page.evaluate("window.location.reload();")
                time.sleep(2)
                
                page.goto("http://localhost:8080/#admin")
                time.sleep(2)
                
                # force hide splash and loader just in case
                page.evaluate("try { document.getElementById('splash-view').style.display = 'none'; } catch(e) {}")
                page.evaluate("try { document.getElementById('app-loader').style.display = 'none'; } catch(e) {}")
                
                try:
                    page.wait_for_selector("#admin-login-view", timeout=10000)
                except:
                    pass
                page.screenshot(path=f"admin_{prefix}_login.png", full_page=True)
                
                page.evaluate("document.getElementById('admin-login-view').style.display = 'none';")
                page.evaluate("document.getElementById('admin-shell').style.display = 'flex';")
                time.sleep(2)

                for view in views[1:]:
                    try:
                        page.evaluate(view['js'])
                    except:
                        pass
                    time.sleep(1)
                    page.screenshot(path=f"admin_{prefix}_{view['name']}.png", full_page=True)

            capture_admin(desktop_page, "desktop")
            capture_admin(mobile_page, "mobile")
                
            browser.close()
            print("Screenshots captured successfully.")
    finally:
        print("Stopping server...")
        server_process.terminate()
        server_process.wait()

if __name__ == "__main__":
    main()
