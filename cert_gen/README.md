# KPH Scraper

## Setup

```bash
pip install -r requirements.txt
python -m playwright install chromium
```

## Run

```bash
./run_pipeline.sh \
  --contest-link "<HACKERRANK_CONTEST_URL>" \
  --contest-name "<CONTEST_NAME>" \
  --contest-date "<CONTEST_DATE>"
```

## Resolver Files

`resolved.json` — participants successfully resolved from `registrations.json`. These are added to the leaderboard when `generate_excel.py` is run.

`manual_review.json` — entries with multiple possible matches. Resolve these manually, move the confirmed entries to `resolved.json`, then run `generate_excel.py`.

`unresolved_final.json` — entries that could not be resolved automatically.