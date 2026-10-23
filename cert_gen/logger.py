"""
logger.py
---------
Shared logging setup for the KPH scraper pipeline.

Import and call get_logger(__name__) at the top of each script:

    from logger import get_logger
    log = get_logger(__name__)

All scripts write to the same rotating log file (pipeline.log) so the
entire run is traceable in one place. Console output mirrors the file
at INFO level; DEBUG lines go to the file only.
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from pathlib import Path

LOG_FILE = Path(__file__).parent / "pipeline.log"
LOG_FORMAT = "%(asctime)s  %(levelname)-8s  [%(name)s]  %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def get_logger(name: str, level: int = logging.DEBUG) -> logging.Logger:
    """
    Return a logger that writes DEBUG+ to pipeline.log and INFO+ to stdout.
    Safe to call multiple times; the root handler is configured only once.
    """
    global _configured

    if not _configured:
        root = logging.getLogger()
        root.setLevel(logging.DEBUG)

        # Rotating file handler — keeps last 3 runs (3 x 5 MB)
        fh = RotatingFileHandler(
            LOG_FILE,
            maxBytes=5 * 1024 * 1024,
            backupCount=3,
            encoding="utf-8",
        )
        fh.setLevel(logging.DEBUG)
        fh.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))

        # Console handler — INFO and above only
        ch = logging.StreamHandler(sys.stdout)
        ch.setLevel(logging.INFO)
        ch.setFormatter(logging.Formatter(LOG_FORMAT, datefmt=DATE_FORMAT))

        root.addHandler(fh)
        root.addHandler(ch)
        _configured = True

    logger = logging.getLogger(name)
    logger.setLevel(level)
    return logger
