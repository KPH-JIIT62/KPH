#!/usr/bin/env python3
"""
Certificate generator.

Reads participant names and enrollment numbers from an Excel sheet and, for every row, stamps the name,
a fixed contest name, and a fixed date straight onto a copy of the
General_Certificate_kph_cmyk.pdf template -- no LibreOffice/PowerPoint
round-trip involved. One PDF per row comes out.

Usage:
    python3 generate_certificates.py \
        --excel entries.xlsx \
        --contest "Knuth Coding Sprint 2026" \
        --date "20th September 2026" \
        --outdir /mnt/user-data/outputs/certificates

Excel requirements: a header row containing "Name" and "Enrollment Number"
columns (case-insensitive). Output filenames follow:
    <name>_<enrollment>_<contest>.pdf
Spaces are retained in filename components; underscores inside components are
changed to hyphens so underscores uniquely separate the three fields.

Font: the fill-in text is meant to use a script-style font (see --font-path
below). Since text is drawn directly into the PDF with reportlab instead of
being opened/rendered by an Office program, the actual font file has to be
handed to this script explicitly -- having it merely "installed" on the OS
is not enough for this approach.
"""
import argparse
import json
import math
import re
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.colors import black

from logger import get_logger

log = get_logger(__name__)

FONT_NAME = "Satisfy"
# Extra italic slant in degrees (0 = font as-is, ~10 = noticeable, ~20 = heavy).
ITALIC_SKEW_DEG = 6
FALLBACK_FONT_NAME = "Helvetica"
BLACK = black

# ---------------------------------------------------------------------------
# Geometry pulled directly from the template PDF (via pdfplumber word/line
# positions), in points, measured from the TOP-LEFT of the page -- same
# convention as before. (x, y) is a box's top-left corner; (cx, cy) is its
# size. All fields are center-aligned / vertically centered inside their
# box, so nudging a box moves the text without touching the drawing code.
#
# The name line is drawn as two rule segments with a diamond graphic in the
# gap between them (left segment x=421.2-793.0, right segment x=838.0-1209.8)
# -- so, same as the old template, the name is split first-word / rest, one
# half on each side of the diamond.
#
# These are rough placements, not pixel-perfect -- nudge freely.
# ---------------------------------------------------------------------------
NAME_LEFT_X = 421.2
NAME_RIGHT_X = 828.0
NAME_HALF_WIDTH = 371.8
NAME_FULL_X = 421.2
NAME_FULL_WIDTH = 1209.8 - 421.2
NAME_TOP = 645.0
NAME_HEIGHT = 120.0
NAME_FONT_PT = 60

CONTEST_X = 396.6
CONTEST_WIDTH = 314.0
CONTEST_TOP = 805.0
CONTEST_HEIGHT = 17.0
CONTEST_FONT_PT = 40

DATE_X = 590.0
DATE_WIDTH = 500.0
DATE_TOP = 850.0
DATE_HEIGHT = 60.0
DATE_FONT_PT = 45


def register_font(font_path: Path | None) -> str:
    """Embed the given font file under the name FONT_NAME so it's baked into
    the output PDFs regardless of what's installed on this machine. Returns
    the font name to actually draw with (FONT_NAME if embedding succeeded,
    otherwise FALLBACK_FONT_NAME)."""
    if font_path is None:
        log.warning(
            "No --font-path given: falling back to %s instead of %s. "
            "Pass --font-path /path/to/Satisfy-Regular.ttf to embed the real font.",
            FALLBACK_FONT_NAME, FONT_NAME,
        )
        return FALLBACK_FONT_NAME
    if not font_path.exists():
        log.warning("Font file not found: %s. Falling back to %s.", font_path, FALLBACK_FONT_NAME)
        return FALLBACK_FONT_NAME
    try:
        pdfmetrics.registerFont(TTFont(FONT_NAME, str(font_path)))
        return FONT_NAME
    except Exception as exc:  # noqa: BLE001
        log.warning("Could not register font %s (%s). Falling back to %s.", font_path, exc, FALLBACK_FONT_NAME)
        return FALLBACK_FONT_NAME


def fitted_size(text: str, box_width_pt: float, base_pt: int, font_name: str, floor_pt: int = 10) -> int:
    """Shrink the font size (using real glyph-width measurements for the
    chosen font) so long fills don't overflow their blank."""
    size = base_pt
    max_width = box_width_pt * 0.92
    while size > floor_pt and pdfmetrics.stringWidth(text, font_name, size) > max_width:
        size -= 1
    return size


def add_text(c, x, y, cx, cy, text, size_pt, font_name, align="center", anchor="middle"):
    """Draw text centered in the box (x, y, cx, cy), where (x, y) is the
    box's top-left corner measured from the top-left of the page and
    cx/cy are the box width/height, all in points. c is a reportlab canvas
    already sized to the template page."""
    page_height = c._pagesize[1]
    c.setFont(font_name, size_pt)
    c.setFillColor(BLACK)

    if align == "center":
        text_x = x + cx / 2
        draw = c.drawCentredString
    else:
        text_x = x
        draw = c.drawString

    if anchor == "middle":
        # Baseline offset that visually centers a line of text in its box:
        # push down from the vertical center by ~35% of the font size to
        # account for the gap between a font's ascent and its cap-height.
        text_y = page_height - (y + cy / 2) - (size_pt * 0.35)
    else:
        text_y = page_height - y - size_pt

    # Extra slant on top of the font's own: shear the text sideways around its
    # anchor point so centering stays put. Set ITALIC_SKEW_DEG = 0 to turn off.
    c.saveState()
    c.translate(text_x, text_y)
    c.transform(1, 0, math.tan(math.radians(ITALIC_SKEW_DEG)), 1, 0, 0)
    draw(0, 0, text)
    c.restoreState()


def split_name(full_name: str):
    parts = full_name.strip().split(None, 1)
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], parts[1]


def safe_filename(text: str) -> str:
    """Sanitize one filename component without using underscores internally.

    Underscores are reserved as separators in <name>_<enrollment>_<contest>.pdf.
    Spaces are preserved for readability; underscores in source values become
    hyphens so the filename can be parsed unambiguously by the mailer.
    """
    text = str(text).strip()
    text = re.sub(r'[<>:"/\\|?*]', "", text)
    text = text.replace("_", "-")
    text = re.sub(r"\s+", " ", text).strip(" .")
    return text or "entry"


def _header_key(value) -> str:
    """Normalize a spreadsheet header for matching."""
    return re.sub(r"[^a-z0-9]", "", str(value or "").lower())


def _cell_text(value) -> str:
    """Convert Excel values to stable text, avoiding numeric '.0' suffixes."""
    if value is None:
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def read_entries(excel_path: Path):
    """Return (name, enrollment) pairs from the workbook's active sheet."""
    try:
        import openpyxl
    except ImportError:
        log.critical("openpyxl is required to parse Excel files. Please install openpyxl or use JSON format.")
        sys.exit(1)
    wb = openpyxl.load_workbook(excel_path, data_only=True)
    ws = wb.active

    header_row = None
    name_col = None
    enrollment_col = None

    enrollment_aliases = {
        "enrollmentnumber", "enrollmentno", "enrollment", "enrollmentid"
    }

    for row in ws.iter_rows(min_row=1, max_row=min(5, ws.max_row)):
        keys = [_header_key(cell.value) for cell in row]
        if "name" in keys and any(key in enrollment_aliases for key in keys):
            header_row = row[0].row
            name_col = keys.index("name")
            enrollment_col = next(i for i, key in enumerate(keys) if key in enrollment_aliases)
            break

    if header_row is None:
        raise ValueError(
            "Could not find a header row containing both 'Name' and "
            "'Enrollment Number' columns in the first 5 rows."
        )

    entries = []
    skipped = 0
    for row in ws.iter_rows(min_row=header_row + 1, max_row=ws.max_row):
        name = _cell_text(row[name_col].value if name_col < len(row) else None)
        enrollment = _cell_text(
            row[enrollment_col].value if enrollment_col < len(row) else None
        )

        if not name:
            continue
        if not enrollment or enrollment.casefold() in {"unknown", "none", "null", "n/a", "na"}:
            log.warning(
                "Skipping '%s': missing/invalid enrollment number; cannot create an email-ready filename.",
                name,
            )
            skipped += 1
            continue

        entries.append((name, enrollment))

    log.info("Read %d usable entries; skipped %d without enrollment numbers.", len(entries), skipped)
    return entries


def build_certificate_pdf(
    template_path: Path, out_pdf: Path, name: str, contest: str, date: str, font_name: str
):
    reader = PdfReader(str(template_path))
    template_page = reader.pages[0]
    page_width = float(template_page.mediabox.width)
    page_height = float(template_page.mediabox.height)

    overlay_path = out_pdf.with_suffix(".overlay.pdf")
    c = canvas.Canvas(str(overlay_path), pagesize=(page_width, page_height))

    first, rest = split_name(name)
    if rest:
        add_text(
            c, NAME_LEFT_X, NAME_TOP, NAME_HALF_WIDTH, NAME_HEIGHT, first,
            fitted_size(first, NAME_HALF_WIDTH, NAME_FONT_PT, font_name), font_name,
        )
        add_text(
            c, NAME_RIGHT_X, NAME_TOP, NAME_HALF_WIDTH, NAME_HEIGHT, rest,
            fitted_size(rest, NAME_HALF_WIDTH, NAME_FONT_PT, font_name), font_name,
        )
    else:
        # single-word name: center across the full rule slot
        add_text(
            c, NAME_FULL_X, NAME_TOP, NAME_FULL_WIDTH, NAME_HEIGHT, first,
            fitted_size(first, NAME_FULL_WIDTH, NAME_FONT_PT, font_name), font_name,
        )

    add_text(
        c, CONTEST_X, CONTEST_TOP, CONTEST_WIDTH, CONTEST_HEIGHT, contest,
        fitted_size(contest, CONTEST_WIDTH, CONTEST_FONT_PT, font_name), font_name,
    )

    add_text(
        c, DATE_X, DATE_TOP, DATE_WIDTH, DATE_HEIGHT, date,
        fitted_size(date, DATE_WIDTH, DATE_FONT_PT, font_name), font_name,
    )

    c.save()

    overlay_reader = PdfReader(str(overlay_path))
    writer = PdfWriter()
    page = reader.pages[0]
    page.merge_page(overlay_reader.pages[0])
    writer.add_page(page)
    with open(out_pdf, "wb") as f:
        writer.write(f)

    overlay_path.unlink(missing_ok=True)


def read_entries_from_json(json_source):
    """Parse participant records from a JSON file path or a raw JSON string."""
    if isinstance(json_source, Path) or (isinstance(json_source, str) and Path(json_source).exists()):
        with open(json_source, "r", encoding="utf-8") as f:
            data = json.load(f)
    elif isinstance(json_source, str):
        data = json.loads(json_source)
    else:
        data = json_source

    raw_list = []
    if isinstance(data, list):
        raw_list = data
    elif isinstance(data, dict):
        for key in ["leaderboard", "standings", "rows", "models", "data", "results", "participants", "recipients"]:
            if isinstance(data.get(key), list):
                raw_list = data[key]
                break

    entries = []
    for idx, item in enumerate(raw_list, start=1):
        if not isinstance(item, dict):
            continue
        name = str(item.get("displayName") or item.get("name") or item.get("Name") or item.get("student_name") or item.get("participantName") or item.get("hacker") or item.get("username") or f"Participant #{idx}").strip()
        hacker_handle = str(item.get("hackerRankHandle") or item.get("hacker") or item.get("username") or "").strip()
        enrollment = str(item.get("enrollmentNo") or item.get("enrollment_no") or item.get("enrollment") or item.get("enrollmentNumber") or "").strip()
        if not enrollment and hacker_handle:
            m = re.match(r"^h?(\d{8,12})$", hacker_handle, re.IGNORECASE)
            if m:
                enrollment = m.group(1)
        if not enrollment:
            enrollment = str(item.get("rank") or idx).strip()

        email = str(item.get("email") or item.get("Email") or item.get("gmail") or item.get("student_email") or "").strip().lower()
        score = item.get("score") or item.get("Score") or item.get("points") or 0
        rank = item.get("rank") or item.get("Rank") or idx

        if not name:
            continue
        entries.append({
            "name": name,
            "enrollment": enrollment,
            "email": email or (f"{enrollment}@mail.jiit.ac.in" if enrollment.isdigit() else ""),
            "score": score,
            "rank": rank,
        })
    return entries


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--excel", type=Path, default=None, help="Path to input Excel file.")
    ap.add_argument("--json", type=Path, default=None, help="Path to input JSON file.")
    ap.add_argument("--json-str", type=str, default=None, help="Raw JSON string containing participant records.")
    ap.add_argument("--contest", required=True, help="Contest name to stamp.")
    ap.add_argument("--date", required=True, help="Date string to stamp (e.g. '23rd October 2026').")

    script_dir = Path(__file__).resolve().parent
    default_tpl = script_dir / "template-nish.pdf"
    if not default_tpl.exists():
        default_tpl = script_dir / "template.pdf"
    default_font = script_dir / "Satisfy-Regular.ttf"
    default_outdir = script_dir / "certificates"

    ap.add_argument("--template", default=default_tpl, type=Path)
    ap.add_argument("--outdir", default=default_outdir, type=Path)
    ap.add_argument(
        "--font-path", type=Path, default=default_font if default_font.exists() else None,
        help="Path to Satisfy .ttf font file.",
    )
    ap.add_argument("--emit-json", action="store_true", help="Print generated certificate metadata as JSON to stdout.")
    args = ap.parse_args()

    log.info("Starting certificate generator.")

    if not args.template.exists():
        log.critical("Template PDF not found at %s", args.template)
        sys.exit(1)

    args.outdir.mkdir(parents=True, exist_ok=True)
    font_name = register_font(args.font_path)

    # Determine input source
    entries = []
    if args.json:
        entries = read_entries_from_json(args.json)
    elif args.json_str:
        entries = read_entries_from_json(args.json_str)
    elif args.excel:
        raw_pairs = read_entries(args.excel)
        entries = [{"name": n, "enrollment": e, "email": f"{e}@mail.jiit.ac.in" if e.isdigit() else "", "score": 0, "rank": idx} for idx, (n, e) in enumerate(raw_pairs, start=1)]
    else:
        log.critical("Must provide either --json, --json-str, or --excel.")
        sys.exit(1)

    if not entries:
        log.critical("No valid entries found to generate certificates.")
        sys.exit(1)

    log.info("Found %d entries. Generating Participation PDFs (font: %s).", len(entries), font_name)
    filename_counts = {}
    results = []
    contest_part = safe_filename(args.contest)

    for idx, item in enumerate(entries, start=1):
        name = item["name"]
        enrollment = item["enrollment"]
        name_part = safe_filename(name)
        enrollment_part = safe_filename(enrollment)
        base = f"{name_part}_{enrollment_part}_{contest_part}"
        filename_counts[base] = filename_counts.get(base, 0) + 1
        suffix = "" if filename_counts[base] == 1 else f"_{filename_counts[base]}"
        filename = f"{base}{suffix}.pdf"
        out_pdf = args.outdir / filename

        build_certificate_pdf(args.template, out_pdf, name, args.contest, args.date, font_name)
        results.append({
            "name": name,
            "enrollmentNo": enrollment,
            "email": item.get("email", ""),
            "rank": item.get("rank", idx),
            "score": item.get("score", 0),
            "contest": args.contest,
            "date": args.date,
            "certificateType": "Participation",
            "filename": filename,
            "path": str(out_pdf.resolve()),
            "url": f"/api/admin/certificates/pdf/{filename}",
            "status": "GENERATED",
        })
        log.debug("[%d/%d] Generated certificate for %s (%s) -> %s", idx, len(entries), name, enrollment, filename)

    log.info("Done. %d certificate PDF(s) written to %s", len(results), args.outdir)

    if args.emit_json:
        payload = {
            "success": True,
            "contest": args.contest,
            "date": args.date,
            "count": len(results),
            "certificates": results,
        }
        print("JSON_START" + json.dumps(payload) + "JSON_END")


if __name__ == "__main__":
    main()