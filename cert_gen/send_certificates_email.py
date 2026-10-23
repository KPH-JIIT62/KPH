#!/usr/bin/env python3
"""
Email dispatcher for generated certificates using mail_automation.

Uses the official Knuth Programming Hub HTML template and sender from
cert_gen/mail_automation.

Sender: kph.jiit@gmail.com (Knuth Programming Hub)
"""
import argparse
import json
import os
import re
import smtplib
import sys
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from logger import get_logger

log = get_logger(__name__)

# Add mail_automation to sys.path so we can import its renderer and automation
MAIL_AUTO_DIR = Path(__file__).resolve().parent / "mail_automation"
OUTBOX_DIR = MAIL_AUTO_DIR / "outbox"
OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
sys.path.insert(0, str(MAIL_AUTO_DIR))

def load_backend_env():
    """Ensure any changes in Backend/.env are immediately picked up without server restart."""
    env_file = Path(__file__).resolve().parent.parent / "Backend" / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                k = k.strip()
                v = v.strip().strip('"').strip("'")
                # Update if not set or empty in environment
                if not os.environ.get(k):
                    os.environ[k] = v

load_backend_env()

try:
    from gmail_sender import (
        render_template,
        send_one_record,
        PROFILE_DIR,
        TEMPLATE_FILE,
        SENT_LOG,
        LAUNCH_ARGS,
        mark_sent,
    )
except Exception as e:
    log.warning("Could not import gmail_sender helper: %s", e)
    render_template = None
    TEMPLATE_FILE = MAIL_AUTO_DIR / "template.html"
    PROFILE_DIR = MAIL_AUTO_DIR / "gmail_profile"
    SENT_LOG = MAIL_AUTO_DIR / "sent.log"
    LAUNCH_ARGS = {"headless": False, "channel": "chrome"}


def get_logged_in_profile_name():
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


def is_profile_logged_in():
    cookie_db_prof1 = PROFILE_DIR / "Profile 1" / "Cookies"
    cookie_db_default = PROFILE_DIR / "Default" / "Cookies"
    for db in (cookie_db_prof1, cookie_db_default):
        if db.exists():
            try:
                import sqlite3
                conn = sqlite3.connect(str(db))
                c = conn.cursor()
                c.execute("SELECT name FROM cookies WHERE host_key LIKE '%google.com%' AND name IN ('SID', 'SSID', 'SAPISID')")
                rows = c.fetchall()
                conn.close()
                if len(rows) > 0:
                    return True
            except Exception:
                pass
    return False


def is_valid_email(email):
    if not email or not isinstance(email, str):
        return False, "Missing recipient email address"
    email = email.strip()
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
        return False, f"Invalid email format: '{email}'"
    local, _ = email.split("@", 1)
    if len(local) < 3:
        return False, f"Invalid student email: '{local}' is dummy or too short"
    if local.isdigit() and len(local) < 8:
        return False, f"Invalid student email: enrollment '{local}' must be at least 8 digits"
    return True, ""


def send_batch(certificates, smtp_host, smtp_port, smtp_user, smtp_pass, from_email, contest_name, date_str=None):
    results = []
    template_text = TEMPLATE_FILE.read_text(encoding="utf-8") if TEMPLATE_FILE.exists() else ""
    sender_id = from_email or os.getenv("SMTP_FROM", "kph.jiit@gmail.com")

    # 1. First, check and attempt Instant SMTP if configured
    server = None
    has_smtp = bool(smtp_host and smtp_user and smtp_pass)
    clean_pass = str(smtp_pass or "").strip().replace(" ", "")
    active_port = int(smtp_port or 587)
    active_ssl = False

    def connect_smtp():
        ports_to_try = [(int(smtp_port or 587), False), (465, True)] if int(smtp_port or 587) != 465 else [(465, True), (587, False)]
        for test_port, use_ssl in ports_to_try:
            try:
                log.info("Connecting to Instant SMTP server at %s:%s (SSL=%s)...", smtp_host, test_port, use_ssl)
                if use_ssl:
                    s = smtplib.SMTP_SSL(smtp_host, test_port, timeout=10)
                else:
                    s = smtplib.SMTP(smtp_host, test_port, timeout=10)
                    s.ehlo()
                    s.starttls()
                s.ehlo()
                s.login(smtp_user, clean_pass)
                # Set generous 45s socket timeout for transmitting PDF attachment bytes
                if hasattr(s, "sock") and s.sock:
                    s.sock.settimeout(45.0)
                log.info("Instant SMTP authenticated successfully as %s on port %s", smtp_user, test_port)
                return s, test_port, use_ssl
            except Exception as exc:
                log.warning("SMTP connection on port %s failed: %s", test_port, exc)
        return None, 587, False

    if has_smtp and clean_pass:
        server, active_port, active_ssl = connect_smtp()

    if server:
        log.info("Dispatch mode: INSTANT SMTP (1-second per email) via %s", smtp_user)
    else:
        if has_smtp:
            log.warning("Direct SMTP ports (587/465) blocked by network/college firewall. Falling back to Gmail Web automation...")
        has_smtp = False

    # 2. If SMTP is not active, initialize Gmail Web Playwright fallback
    has_gmail_profile = is_profile_logged_in() if not server else False
    browser_context = None
    page = None
    pw_instance = None

    if not server and has_gmail_profile:
        try:
            from playwright.sync_api import sync_playwright
            pw_instance = sync_playwright().start()

            launch_args = dict(LAUNCH_ARGS)
            launch_args["headless"] = True
            args_list = list(launch_args.get("args", []))
            for stealth_arg in (
                "--headless=new",
                "--disable-gpu",
                "--no-first-run",
                "--no-default-browser-check",
                "--window-position=-2400,-2400",
            ):
                if stealth_arg not in args_list:
                    args_list.append(stealth_arg)

            prof_name = get_logged_in_profile_name()
            if prof_name:
                args_list.append(f"--profile-directory={prof_name}")
            launch_args["args"] = args_list

            browser_context = pw_instance.chromium.launch_persistent_context(
                user_data_dir=str(PROFILE_DIR.resolve()),
                **launch_args
            )
            browser_context.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined});")
            page = browser_context.pages[0] if browser_context.pages else browser_context.new_page()
            page.goto("https://mail.google.com/mail/u/0/#inbox", wait_until="domcontentloaded", timeout=45000)

            # Wait up to 15 seconds for redirection to complete
            for _ in range(15):
                if "accounts.google.com" not in page.url and "mail.google.com" in page.url:
                    break
                page.wait_for_timeout(1000)
            page.wait_for_timeout(1000)

            if "accounts.google.com" in page.url:
                log.warning("Gmail session in gmail_profile expired. Run `python3 cert_gen/mail_automation/gmail_sender.py --login`.")
                browser_context.close()
                browser_context = None
                page = None
                has_gmail_profile = False
            else:
                log.info("Gmail web session loaded successfully: %s", page.url)
        except Exception as exc:
            log.warning("Could not launch Playwright browser context: %s", exc)
            if browser_context:
                try:
                    browser_context.close()
                except Exception:
                    pass
            browser_context = None
            page = None
            has_gmail_profile = False

    for item in certificates:
        name = item.get("name", "Participant")
        email = item.get("email", "").strip()
        filename = item.get("filename", "")
        raw_path = str(item.get("path", "")).strip()
        enrollment = item.get("enrollmentNo") or item.get("enrollment") or ""
        pdf_path = Path(raw_path) if raw_path else None

        if not pdf_path or not pdf_path.exists() or pdf_path.is_dir():
            fallback = Path(__file__).resolve().parent / "certificates" / (filename or (pdf_path.name if pdf_path else ""))
            if fallback.exists() and fallback.is_file():
                pdf_path = fallback

        valid, reason = is_valid_email(email)
        if not valid:
            results.append({
                "name": name,
                "email": email,
                "status": "FAILED",
                "filename": filename or (pdf_path.name if pdf_path else ""),
                "reason": reason,
            })
            continue

        if not pdf_path or not pdf_path.exists() or not pdf_path.is_file():
            results.append({
                "name": name,
                "email": email,
                "status": "FAILED",
                "filename": filename or (pdf_path.name if pdf_path else ""),
                "reason": f"Certificate PDF file not found ({filename or raw_path})",
            })
            continue

        # Extract enrollment from email if missing
        if not enrollment and email:
            local = email.split("@")[0]
            if local.isdigit():
                enrollment = local

        # Render HTML using the mail_automation template
        if render_template and template_text:
            try:
                html_body, subject = render_template(
                    template_text,
                    name=name,
                    enrollment=enrollment or "Student",
                    contest=contest_name,
                    pdf=pdf_path,
                )
            except Exception as e:
                log.warning("render_template failed: %s. Using basic HTML.", e)
                subject = f"Certificate - {contest_name}"
                html_body = template_text
        else:
            subject = f"Certificate - {contest_name}"
            html_body = template_text

        # 1. Try Instant SMTP Delivery if configured (1-second dispatch)
        if has_smtp:
            sent_via_smtp = False
            for attempt in range(2):
                try:
                    if not server:
                        log.info("Reconnecting SMTP for %s...", email)
                        server, active_port, active_ssl = connect_smtp()
                    if not server:
                        break

                    msg = MIMEMultipart()
                    msg["From"] = f"Knuth Programming Hub <{sender_id}>"
                    msg["To"] = email
                    msg["Subject"] = subject
                    msg.attach(MIMEText(html_body, "html"))

                    with open(pdf_path, "rb") as f:
                        part = MIMEBase("application", "pdf")
                        part.set_payload(f.read())
                    encoders.encode_base64(part)
                    part.add_header("Content-Disposition", f'attachment; filename="{pdf_path.name}"')
                    msg.attach(part)

                    server.sendmail(sender_id, [email], msg.as_string())
                    mark_sent(pdf_path.name)
                    results.append({
                        "name": name,
                        "email": email,
                        "status": "SENT",
                        "filename": pdf_path.name,
                        "method": "SMTP",
                    })
                    log.info("Sent certificate to %s <%s> via Instant SMTP", name, email)
                    sent_via_smtp = True
                    break
                except Exception as exc:
                    log.warning("SMTP dispatch attempt %d failed for %s: %s", attempt + 1, email, exc)
                    if server:
                        try:
                            server.close()
                        except Exception:
                            pass
                        server = None

            if sent_via_smtp:
                continue

        # 2. Try Gmail Web Automation if active
        if page:
            try:
                log.info("Sending certificate to %s <%s> via Gmail Web...", name, email)
                send_one_record(page, pdf_path, template_text, name, enrollment, email, contest_name)
                mark_sent(pdf_path.name)
                results.append({
                    "name": name,
                    "email": email,
                    "status": "SENT",
                    "filename": pdf_path.name,
                    "method": "GMAIL_WEB",
                })
                log.info("Sent certificate to %s <%s> via Gmail Web", name, email)
                continue
            except Exception as exc:
                log.error("Failed to send to %s via Gmail Web: %s", email, exc)
                results.append({
                    "name": name,
                    "email": email,
                    "status": "FAILED",
                    "filename": pdf_path.name,
                    "reason": f"Gmail Web delivery failed: {exc}",
                })
                continue

        # 3. If neither Gmail Web nor SMTP was successful, email was NOT sent
        try:
            safe_prefix = re.sub(r"[^\w\-]", "_", f"{enrollment or name}_{contest_name}")
            outbox_html = OUTBOX_DIR / f"{safe_prefix}.html"
            outbox_html.write_text(html_body, encoding="utf-8")

            eml_msg = MIMEMultipart()
            eml_msg["From"] = sender_id
            eml_msg["To"] = email
            eml_msg["Subject"] = subject
            eml_msg.attach(MIMEText(html_body, "html"))

            with open(pdf_path, "rb") as f:
                part = MIMEBase("application", "pdf")
                part.set_payload(f.read())
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", f'attachment; filename="{pdf_path.name}"')
            eml_msg.attach(part)

            outbox_eml = OUTBOX_DIR / f"{safe_prefix}.eml"
            outbox_eml.write_bytes(eml_msg.as_bytes())

            results.append({
                "name": name,
                "email": email,
                "status": "FAILED",
                "filename": pdf_path.name,
                "reason": "Email not delivered. Please log into Gmail using python3 cert_gen/mail_automation/gmail_sender.py --login",
            })
            log.warning("Email not sent for %s <%s>; saved backup package to outbox", name, email)
        except Exception as exc:
            log.error("Failed to package certificate dispatch for %s: %s", email, exc)
            results.append({
                "name": name,
                "email": email,
                "status": "FAILED",
                "filename": pdf_path.name,
                "reason": f"Email dispatch failed: {exc}",
            })

    # Cleanup browser / server
    if browser_context:
        try:
            browser_context.close()
        except Exception:
            pass
    if pw_instance:
        try:
            pw_instance.stop()
        except Exception:
            pass
    if server:
        try:
            server.quit()
        except Exception:
            pass

    return results


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--json", type=Path, default=None)
    ap.add_argument("--json-str", type=str, default=None)
    ap.add_argument("--contest", default="KPH Contest")
    ap.add_argument("--smtp-host", default=os.getenv("SMTP_HOST", "smtp.gmail.com"))
    ap.add_argument("--smtp-port", default=int(os.getenv("SMTP_PORT", "587")))
    ap.add_argument("--smtp-user", default=os.getenv("SMTP_USER", "kph.jiit@gmail.com"))
    ap.add_argument("--smtp-pass", default=os.getenv("SMTP_PASS", ""))
    ap.add_argument("--from-email", default=os.getenv("SMTP_FROM", "kph.jiit@gmail.com"))
    ap.add_argument("--emit-json", action="store_true")
    args = ap.parse_args()

    certs = []
    if args.json and args.json.exists():
        with open(args.json, "r", encoding="utf-8") as f:
            data = json.load(f)
            certs = data if isinstance(data, list) else data.get("certificates", [])
    elif args.json_str:
        data = json.loads(args.json_str)
        certs = data if isinstance(data, list) else data.get("certificates", [])

    results = send_batch(
        certs,
        args.smtp_host,
        args.smtp_port,
        args.smtp_user,
        args.smtp_pass,
        args.from_email,
        args.contest,
    )

    if args.emit_json:
        sent_count = sum(1 for r in results if r.get("status") == "SENT")
        failed_count = sum(1 for r in results if r.get("status") == "FAILED")
        has_smtp = bool(args.smtp_user and args.smtp_pass)
        has_gmail = is_profile_logged_in()
        sender_method = "SMTP" if has_smtp else ("GMAIL_WEB" if has_gmail else "NONE")
        payload = {
            "success": True,
            "total": len(results),
            "sentCount": sent_count,
            "failedCount": failed_count,
            "hasSenderConfigured": has_smtp or has_gmail,
            "senderMethod": sender_method,
            "senderEmail": args.from_email or "kph.jiit@gmail.com",
            "hasSmtpConfigured": has_smtp,
            "results": results,
        }
        print("JSON_START" + json.dumps(payload) + "JSON_END")


if __name__ == "__main__":
    main()
