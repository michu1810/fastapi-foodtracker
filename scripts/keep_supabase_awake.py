"""Keep the Supabase Postgres project active with a tiny scheduled write.

Expected environment:
    SUPABASE_DATABASE_URL or DATABASE_URL
"""

from __future__ import annotations

import asyncio
import os
import sys
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import asyncpg


KEEPALIVE_SQL = """
CREATE TABLE IF NOT EXISTS public.keepalive_ping (
    id integer PRIMARY KEY CHECK (id = 1),
    pinged_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.keepalive_ping (id, pinged_at)
VALUES (1, now())
ON CONFLICT (id) DO UPDATE
SET pinged_at = EXCLUDED.pinged_at;
"""


def normalize_database_url(raw_url: str) -> str:
    """Convert SQLAlchemy async URLs to a plain asyncpg-compatible Postgres DSN."""
    if not raw_url:
        raise ValueError("SUPABASE_DATABASE_URL or DATABASE_URL is required")

    parts = urlsplit(raw_url.replace("postgresql+asyncpg://", "postgresql://", 1))
    query = dict(parse_qsl(parts.query, keep_blank_values=True))
    query.setdefault("sslmode", "require")
    return urlunsplit((parts.scheme, parts.netloc, parts.path, urlencode(query), parts.fragment))


async def main() -> None:
    raw_url = os.getenv("SUPABASE_DATABASE_URL") or os.getenv("DATABASE_URL", "")
    database_url = normalize_database_url(raw_url)

    conn = await asyncpg.connect(database_url, timeout=20)
    try:
        await conn.execute(KEEPALIVE_SQL)
        pinged_at = await conn.fetchval(
            "SELECT pinged_at FROM public.keepalive_ping WHERE id = 1"
        )
    finally:
        await conn.close()

    print(f"Supabase keepalive ping written at {pinged_at}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception as exc:
        print(f"Supabase keepalive failed: {exc}", file=sys.stderr)
        raise
