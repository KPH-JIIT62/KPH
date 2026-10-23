#!/usr/bin/env python3
"""Send certificates from ../cert_gen/certificates using Gmail's web UI.

Expected filename: <name>_<enrollment>_<contest>.pdf
First-time Gmail session setup: python gmail_sender.py --login
Dry run: python gmail_sender.py --dry-run
Send: python gmail_sender.py [contest name] [event date]
Per-event values (EVENT_NAME, EVENT_DATE, subject/title templates, ...) live in CONFIGURATION.

Edit CONFIGURATION below. The HTML template retains a complete, previewable
visual design; invisible comments mark the areas populated from this file.
"""

import argparse
import html as htmllib
import re
import time
from datetime import datetime
from pathlib import Path

from playwright.sync_api import sync_playwright

# ============================================================================
# CONFIGURATION — edit these values
# ============================================================================
EVENT_NAME = " "# leave "" to use the contest name from each PDF filename; set e.g. "C/C++ Workshop" to override
EVENT_DATE = "15th October 2026"
# Placeholders usable in the *_TEMPLATE strings: {name} {first_name} {enrollment} {contest} {date}
EMAIL_SUBJECT_TEMPLATE = "Certificate - {contest}"
EMAIL_TITLE_TEMPLATE = "Thanks for joining {contest}"
PREHEADER_TEXT = "Your certificate is attached. Thanks for being part of it."
TOPBAR_TEXT = "knuth-programming-hub ~ mail"
TERMINAL_COMMAND_TEMPLATE = '$ ./thank_you.sh --user'  # no name here on purpose
SUCCESS_TITLE = "Event Success"
SUCCESS_STATUS_TEXT = "Participation recorded · Status: Executed"
GREETING_PREFIX = "Hi"
INTRO_PREFIX = "Thank you for being part of"
DATE_CONNECTOR = "on"
PARTICIPATION_TEXT = "It was great having you with us, and we hope you had fun."
NEXT_SECTION_TITLE = "Before you go"
NEXT_SECTION_HTML = (
    "Your certificate is attached to this email.<br>\n"
    "Some problems will beat you, and that's okay. Come back tomorrow and try again.<br>\n"
    "We'd love to see you at our next event. Check our website to see what's coming up."
)
LOGO_URL = (
    "https://encrypted-tbn0.gstatic.com/images?"
    "q=tbn:ANd9GcSkJEHOK8uZi0wRotEefZVakIGcaWBoCQK7SyzeFVyJRuW1UYGJTCIDM0s&s=10"
)
LOGO_ALT = "Knuth Programming Hub"
LOGO_WIDTH_PX = 170
CTA_URL = "https://kph-jiit.vercel.app/"
CTA_TEXT = "Learn more"
CTA_FALLBACK_PREFIX = "or paste this in your browser:"
CTA_DISPLAY_URL = "kph-jiit.vercel.app"
SIGNOFF_TEXT = ""  # empty = no sign-off line (the signature below still shows)
SIGNATURE_NAME = "Knuth Programming Hub"
SENDER_EMAIL = "kph.jiit@gmail.com"
ORGANIZATION_LOCATION = "JIIT, Noida Sec-62"
FOOTER_TEXT = "contests · workshops · DSA · repeat"

# Visual theme. CSS defaults in template.html match these values so the HTML
# looks correct when opened directly. Python replaces the literal defaults at send time.
COLOR_BACKGROUND = "#0a0a0a"
COLOR_CARD_BACKGROUND = "#111111"
COLOR_TOPBAR_BACKGROUND = "#1a1d1a"
COLOR_BORDER = "#2a2f2a"
COLOR_ACCENT = "#8dc63f"
COLOR_TEXT = "#d6dbd6"
COLOR_MUTED = "#7d8590"
COLOR_SUCCESS_BACKGROUND = "#0f1f10"
COLOR_SUCCESS_MUTED = "#9aa59a"
COLOR_FOOTER_TEXT = "#5b625b"
COLOR_WHITE = "#ffffff"
COLOR_BLACK = "#000000"
COLOR_RED = "#ff5f56"
COLOR_YELLOW = "#ffbd2e"
CARD_WIDTH_PX = 600
FONT_STACK = "'SF Mono','Fira Code',Consolas,Menlo,'Courier New',monospace"

SCRIPT_DIR = Path(__file__).resolve().parent
PROFILE_DIR = SCRIPT_DIR / "gmail_profile"
CERT_DIR = SCRIPT_DIR.parent / "certificates"
TEMPLATE_FILE = SCRIPT_DIR / "template.html"
SENT_LOG = SCRIPT_DIR / "sent.log"
DELAY_SECONDS = 2

LAUNCH_ARGS = {
    "headless": True,
    "channel": "chrome",
    "viewport": {"width": 1400, "height": 900},
    "bypass_csp": True,
    "args": [
        "--headless=new",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
        "--window-position=-2400,-2400",
    ],
    "ignore_default_args": ["--enable-automation"],
}

# ============================================================================
# TEMPLATE RENDERING
# ============================================================================


def replace_html_marker(template: str, key: str, value: str) -> str:
    """Replace the content between invisible <!--CFG:key:START/END--> comments."""
    pattern = re.compile(
        rf"<!--CFG:{re.escape(key)}:START-->.*?<!--CFG:{re.escape(key)}:END-->",
        re.DOTALL,
    )
    result, count = pattern.subn(lambda _m: str(value), template, count=1)
    if count != 1:
        raise ValueError(f"Template marker missing or duplicated: {key}")
    return result


def first_name_of(name: str) -> str:
    parts = name.split()
    return parts[0] if parts else name


def resolve_contest(override, file_contest):
    """CLI argument > EVENT_NAME global > contest name from the PDF filename."""
    return override or EVENT_NAME or file_contest


def template_fields(name, enrollment, contest):
    return {
        "name": name,
        "first_name": first_name_of(name),
        "enrollment": enrollment,
        "contest": contest,
        "date": EVENT_DATE,
    }


def parse_filename(pdf: Path):
    # Greedy name prefix supports underscores before the enrollment number.
    match = re.match(r"^(.+)_(\d{8,14})_(.+)\.pdf$", pdf.name, re.IGNORECASE)
    if not match:
        raise ValueError(
            f"Invalid filename: {pdf.name}; expected "
            "<name>_<8-14 digit enrollment>_<contest>.pdf"
        )
    name, enrollment, contest = (part.strip() for part in match.groups())
    if not name or not contest:
        raise ValueError(f"Missing name or contest in filename: {pdf.name}")
    return name.replace("-", " ").replace("_", " "), enrollment, contest, f"{enrollment}@mail.jiit.ac.in"


def get_pdfs():
    valid, ignored = [], []
    for pdf in sorted(CERT_DIR.glob("*.pdf")):
        try:
            parse_filename(pdf)
            valid.append(pdf)
        except ValueError:
            ignored.append(pdf.name)
    if ignored:
        print(f"Ignoring {len(ignored)} PDF(s) with an unexpected filename format.")
        for name in ignored[:5]:
            print(f"  - {name}")
        if len(ignored) > 5:
            print(f"  ... and {len(ignored) - 5} more")
    return valid


def load_sent():
    if not SENT_LOG.exists():
        return set()
    return {line.strip() for line in SENT_LOG.read_text(encoding="utf-8").splitlines() if line.strip()}


def mark_sent(filename):
    with SENT_LOG.open("a", encoding="utf-8") as stream:
        stream.write(filename + "\n")


def render_template(template: str, name: str, enrollment: str, contest: str, pdf: Path):
    fields = template_fields(name, enrollment, contest)
    first_name_html = htmllib.escape(fields["first_name"])
    contest_html = htmllib.escape(contest)
    date_html = htmllib.escape(EVENT_DATE)

    email_title = htmllib.escape(EMAIL_TITLE_TEMPLATE.format(**fields))
    subject = EMAIL_SUBJECT_TEMPLATE.format(**fields)
    terminal_command = htmllib.escape(TERMINAL_COMMAND_TEMPLATE.format(**fields))
    greeting_html = (
        f"{htmllib.escape(GREETING_PREFIX)} "
        f'<b style="color:{COLOR_WHITE};">{first_name_html}</b>,'
    )
    intro_html = (
        f"{htmllib.escape(INTRO_PREFIX)} "
        f'<b style="color:{COLOR_WHITE};">{contest_html}</b> '
        f"{htmllib.escape(DATE_CONNECTOR)} "
        f'<b style="color:{COLOR_WHITE};">{date_html}</b>. '
        f"{htmllib.escape(PARTICIPATION_TEXT)}"
    )

    blocks = {
        "EMAIL_TITLE": email_title,
        "PREHEADER_TEXT": htmllib.escape(PREHEADER_TEXT),
        "TOPBAR_TEXT": htmllib.escape(TOPBAR_TEXT),
        "TERMINAL_COMMAND": terminal_command,
        "SUCCESS_TITLE": htmllib.escape(SUCCESS_TITLE),
        "SUCCESS_STATUS": htmllib.escape(SUCCESS_STATUS_TEXT),
        "GREETING_HTML": greeting_html,
        "INTRO_HTML": intro_html,
        "NEXT_SECTION_TITLE": htmllib.escape(NEXT_SECTION_TITLE),
        "NEXT_SECTION_HTML": NEXT_SECTION_HTML,
        "CTA_TEXT": htmllib.escape(CTA_TEXT),
        "CTA_FALLBACK_PREFIX": htmllib.escape(CTA_FALLBACK_PREFIX),
        "CTA_DISPLAY_URL": htmllib.escape(CTA_DISPLAY_URL),
        "SIGNOFF_TEXT": htmllib.escape(SIGNOFF_TEXT),
        "SIGNATURE_NAME": htmllib.escape(SIGNATURE_NAME),
        "ORGANIZATION_LOCATION": htmllib.escape(ORGANIZATION_LOCATION),
        "FOOTER_TEXT": htmllib.escape(FOOTER_TEXT),
    }
    if not SIGNOFF_TEXT.strip():
        # Remove the sign-off line and its <br> so no blank line is left behind.
        template = re.sub(
            r"<!--CFG:SIGNOFF_TEXT:START-->.*?<!--CFG:SIGNOFF_TEXT:END--><br>\s*",
            "", template, count=1, flags=re.DOTALL,
        )
        blocks.pop("SIGNOFF_TEXT")
    for key, value in blocks.items():
        template = replace_html_marker(template, key, value)

    # Replace URL and image metadata while leaving the template previewable.
    default_logo_url = (
        "https://encrypted-tbn0.gstatic.com/images?"
        "q=tbn:ANd9GcSkJEHOK8uZi0wRotEefZVakIGcaWBoCQK7SyzeFVyJRuW1UYGJTCIDM0s&amp;s=10"
    )
    template = template.replace(default_logo_url, htmllib.escape(LOGO_URL, quote=True))
    template = re.sub(
        r'(<img\b[^>]*\balt=")[^"]*(")',
        lambda m: m.group(1) + htmllib.escape(LOGO_ALT, quote=True) + m.group(2),
        template,
        count=1,
        flags=re.IGNORECASE | re.DOTALL,
    )
    template = re.sub(
        r'(<img\b[^>]*\bwidth=")\d+("[^>]*\bstyle="[^"]*\bwidth:)\d+px',
        lambda m: m.group(1) + str(int(LOGO_WIDTH_PX)) + m.group(2) + str(int(LOGO_WIDTH_PX)) + "px",
        template,
        count=1,
        flags=re.IGNORECASE | re.DOTALL,
    )
    template = template.replace('href="https://kph-jiit.vercel.app/"', f'href="{htmllib.escape(CTA_URL, quote=True)}"')
    # Fluid card: full width on phones, capped at CARD_WIDTH_PX on desktop.
    # (Gmail strips <style>/media queries from composed mail, so this must be inline.)
    template = template.replace("max-width:600px", f"max-width:{int(CARD_WIDTH_PX)}px")

    # Replace literal default styles in a two-pass mapping so custom values cannot
    # accidentally be replaced again if they equal another default color.
    color_map = {
        "#0a0a0a": COLOR_BACKGROUND,
        "#111111": COLOR_CARD_BACKGROUND,
        "#1a1d1a": COLOR_TOPBAR_BACKGROUND,
        "#2a2f2a": COLOR_BORDER,
        "#8dc63f": COLOR_ACCENT,
        "#d6dbd6": COLOR_TEXT,
        "#7d8590": COLOR_MUTED,
        "#0f1f10": COLOR_SUCCESS_BACKGROUND,
        "#9aa59a": COLOR_SUCCESS_MUTED,
        "#5b625b": COLOR_FOOTER_TEXT,
        "#ffffff": COLOR_WHITE,
        "#000000": COLOR_BLACK,
        "#ff5f56": COLOR_RED,
        "#ffbd2e": COLOR_YELLOW,
    }
    sentinels = {}
    for i, (default, configured) in enumerate(color_map.items()):
        sentinel = f"__KPH_COLOR_{i}__"
        template = template.replace(default, sentinel)
        sentinels[sentinel] = configured
    for sentinel, configured in sentinels.items():
        template = template.replace(sentinel, configured)

    default_font = "'SF Mono','Fira Code',Consolas,Menlo,'Courier New',monospace"
    template = template.replace(default_font, FONT_STACK)

    return template, subject

# ============================================================================
# GMAIL UI AUTOMATION
# ============================================================================


def fill_html(editor, html):
    editor.click()
    editor.evaluate(
        """(element, html) => {
            element.focus();
            document.execCommand("selectAll", false, null);
            const ok = document.execCommand("insertHTML", false, html);
            if (!ok) throw new Error("insertHTML returned false");
        }""",
        html,
    )


def first_visible(compose, selectors):
    for selector in selectors:
        locator = compose.locator(selector)
        for i in range(locator.count()):
            item = locator.nth(i)
            try:
                if item.is_visible():
                    return item
            except Exception:
                pass
    return None


SUBJECT_SEL = 'input[name="subjectbox"]'


def get_logged_in_profile_name():
    """Find which profile directory (Profile 1, Default, etc.) has Google auth cookies."""
    for prof in sorted(PROFILE_DIR.glob("Profile *")) + [PROFILE_DIR / "Default"]:
        cookie_db = prof / "Cookies"
        if cookie_db.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(str(cookie_db))
                c = conn.cursor()
                c.execute("SELECT name FROM cookies WHERE host_key LIKE '%google.com%' AND name IN ('SID', 'SSID', 'SAPISID')")
                rows = c.fetchall()
                conn.close()
                if len(rows) > 0:
                    return prof.name
            except Exception:
                pass
    return "Profile 1" if (PROFILE_DIR / "Profile 1").exists() else "Default"


def is_profile_logged_in() -> bool:
    for prof in sorted(PROFILE_DIR.glob("Profile *")) + [PROFILE_DIR / "Default"]:
        cookie_db = prof / "Cookies"
        if cookie_db.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(str(cookie_db))
                c = conn.cursor()
                c.execute("SELECT name FROM cookies WHERE host_key LIKE '%google.com%' AND name IN ('SID', 'SSID', 'SAPISID')")
                rows = c.fetchall()
                conn.close()
                if len(rows) > 0:
                    return True
            except Exception:
                pass
    return False


def find_compose(page):
    page.wait_for_selector(SUBJECT_SEL, state="visible", timeout=20000)
    subject = page.locator(SUBJECT_SEL).last
    dialog = subject.locator('xpath=ancestor::div[@role="dialog"][1]')
    return dialog.first if dialog.count() > 0 else page.locator("body")


def open_compose(page):
    # Try finding the Compose button via Playwright role locator first
    compose_btn = page.get_by_role("button", name="Compose")
    if compose_btn.count() > 0 and compose_btn.first.is_visible():
        compose_btn.first.click()
        return

    for selector in (
        'div[gh="cm"]',
        'div[role="button"][aria-label*="Compose"]',
        'button[aria-label*="Compose"]',
        '[data-tooltip*="Compose"]',
    ):
        locator = page.locator(selector)
        if locator.count() > 0 and locator.first.is_visible():
            locator.first.click()
            return
    try:
        page.locator('div[gh="cm"], div[role="button"][aria-label*="Compose"]').first.wait_for(state="visible", timeout=6000)
        page.locator('div[gh="cm"], div[role="button"][aria-label*="Compose"]').first.click()
        return
    except Exception:
        pass
    try:
        page.goto("https://mail.google.com/mail/u/0/#inbox?compose=new", wait_until="domcontentloaded")
    except Exception:
        page.keyboard.press("c")


def compose_closed(page, timeout=15000):
    try:
        page.locator(SUBJECT_SEL).first.wait_for(state="hidden", timeout=timeout)
        return True
    except Exception:
        return False


def send_one_record(page, pdf, template, name, enrollment, email, contest):
    rendered_html, subject_text = render_template(template, name, enrollment, contest, pdf)

    open_compose(page)
    compose = find_compose(page)

    # Wait for recipient input
    to_input = compose.locator('input[aria-label*="To" i], input[role="combobox"]').first
    if not to_input.is_visible():
        to_input = page.locator('input[aria-label*="To" i], input[role="combobox"]').last
    try:
        to_input.wait_for(state="visible", timeout=8000)
    except Exception:
        pass

    if not to_input.is_visible():
        to_input = first_visible(compose, [
            'input[aria-label*="To" i]',
            'input[placeholder*="Recipients" i]',
            'input[name="to"]',
            'input[peoplekit-id="BbVjBd"]',
            'input[role="combobox"]',
        ])
    if to_input is None:
        raise RuntimeError("Could not find recipient field.")
    to_input.fill(email)
    page.wait_for_timeout(200)
    to_input.press("Enter")
    page.wait_for_timeout(200)

    subject = first_visible(compose, ['input[name="subjectbox"]', 'input[placeholder*="Subject"]'])
    if subject is None:
        raise RuntimeError("Could not find subject field.")
    subject.fill(subject_text)

    body = first_visible(compose, [
        'div[contenteditable="true"][aria-label*="Message Body"]',
        'div[contenteditable="true"][aria-label*="Message body"]',
        'div[contenteditable="true"][role="textbox"]',
    ])
    if body is None:
        raise RuntimeError("Could not find message body.")
    fill_html(body, rendered_html)
    page.wait_for_timeout(200)
    if len(body.inner_text().strip()) < 20:
        raise RuntimeError("Email body is empty after inserting HTML.")

    file_input = compose.locator('input[type="file"]')
    if file_input.count() == 0:
        file_input = page.locator('input[type="file"]')
    if file_input.count() == 0:
        raise RuntimeError("Could not find attachment input.")
    file_input.last.set_input_files(str(pdf.resolve()))

    # Wait for attachment upload progress bar to disappear
    for _ in range(60):
        progress = compose.locator('div[role="progressbar"], div[aria-label*="Uploading"]')
        if progress.count() == 0:
            break
        page.wait_for_timeout(300)

    page.wait_for_timeout(400)

    send_button = compose.locator('div[role="button"][aria-label*="Send"], div[role="button"][data-tooltip*="Send"]')
    if send_button.count() > 0 and send_button.first.is_visible():
        send_button.first.click()
    else:
        body.click()
        page.keyboard.press("Meta+Enter")

    # Confirm compose dialog closes and wait for "Message sent"
    confirmed = False
    for _ in range(25):
        msg_sent = page.locator('text="Message sent"')
        uploading_banner = page.locator('text="uploading attachments"')
        if msg_sent.count() > 0 and msg_sent.first.is_visible():
            confirmed = True
            break
        if uploading_banner.count() == 0 and compose_closed(page, 500):
            confirmed = True
            break
        page.wait_for_timeout(300)

    if not confirmed and not compose_closed(page, 2000):
        body.click()
        page.keyboard.press("Meta+Enter")
        if not compose_closed(page, 3000):
            raise RuntimeError("Compose window is still open; email was not confirmed sent.")
    page.wait_for_timeout(400)
    return email


def send_one(page, pdf, template, contest_override=None):
    name, enrollment, file_contest, email = parse_filename(pdf)
    contest = resolve_contest(contest_override, file_contest)
    return send_one_record(page, pdf, template, name, enrollment, email, contest)


def login_mode():
    login_launch = dict(LAUNCH_ARGS)
    login_launch["headless"] = False
    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR.resolve()), **login_launch
        )
        context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
        page = context.pages[0] if context.pages else context.new_page()
        login_url = "https://accounts.google.com/AccountChooser?service=mail&continue=https://mail.google.com/mail/&Email=kph.jiit@gmail.com"
        page.goto(login_url, wait_until="domcontentloaded")
        print("\nLog into the Gmail account: kph.jiit@gmail.com")
        print("After Gmail inbox is fully loaded, press ENTER here.")
        input()
        print(f"\nProfile saved at: {PROFILE_DIR.resolve()}")
        context.close()


def send_mode(contest_override=None, date_override=None, dry_run=False):
    global EVENT_DATE
    if date_override:
        EVENT_DATE = date_override

    if not TEMPLATE_FILE.exists():
        print(f"Missing template: {TEMPLATE_FILE.resolve()}")
        return
    template = TEMPLATE_FILE.read_text(encoding="utf-8")
    pdfs = get_pdfs()
    if not pdfs:
        print(f"No valid PDFs found in: {CERT_DIR.resolve()}")
        return
    sent = load_sent()

    print(f"Event date: {EVENT_DATE}")
    print(f"Found {len(pdfs)} valid certificates; already sent: {len(sent)}")

    if dry_run:
        for pdf in pdfs:
            if pdf.name in sent:
                print(f"SKIP (already logged): {pdf.name}")
                continue
            name, enrollment, file_contest, email = parse_filename(pdf)
            contest = resolve_contest(contest_override, file_contest)
            # Validate all markers/config without opening Gmail.
            render_template(template, name, enrollment, contest, pdf)
            print(f"Would send: {pdf.name} -> {email} | {EMAIL_SUBJECT_TEMPLATE.format(**template_fields(name, enrollment, contest))}")
        return

    if not PROFILE_DIR.exists():
        print("No Gmail profile found. Run: python gmail_sender.py --login")
        return

    launch_args = dict(LAUNCH_ARGS)
    args_list = list(launch_args.get("args", []))
    prof_name = get_logged_in_profile_name()
    if prof_name:
        args_list.append(f"--profile-directory={prof_name}")
    launch_args["args"] = args_list

    with sync_playwright() as p:
        context = p.chromium.launch_persistent_context(
            user_data_dir=str(PROFILE_DIR.resolve()), **launch_args
        )
        context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
        page = context.pages[0] if context.pages else context.new_page()
        page.goto("https://mail.google.com", wait_until="domcontentloaded")
        page.wait_for_timeout(4000)
        if "accounts.google.com" in page.url:
            print("Gmail session expired. Run: python gmail_sender.py --login")
            context.close()
            return

        for i, pdf in enumerate(pdfs, 1):
            if pdf.name in sent:
                print(f"[{i}/{len(pdfs)}] SKIP {pdf.name}")
                continue
            try:
                name, enrollment, file_contest, email = parse_filename(pdf)
                email = send_one(page, pdf, template, contest_override=contest_override)
                mark_sent(pdf.name)
                print(f"[{i}/{len(pdfs)}] SENT {pdf.name} -> {email}")
                time.sleep(DELAY_SECONDS)
            except Exception as exc:
                print(f"[{i}/{len(pdfs)}] FAILED {pdf.name}: {type(exc).__name__}: {exc}")
                try:
                    page.screenshot(path="debug.png")
                except Exception:
                    pass
                time.sleep(2)
        context.close()
    print("Done.")


def main():
    parser = argparse.ArgumentParser(description="Email certificates through Gmail.")
    parser.add_argument("--login", action="store_true", help="open Chrome and log into sender Gmail")
    parser.add_argument("--dry-run", action="store_true", help="show recipients and validate template without sending")
    parser.add_argument("contest", nargs="?", default=None, help="optional override contest name")
    parser.add_argument("date", nargs="?", default=None, help="optional override event date")
    args = parser.parse_args()
    if args.login:
        login_mode()
    else:
        send_mode(args.contest, args.date, args.dry_run)


if __name__ == "__main__":
    main()