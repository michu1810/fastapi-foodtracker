import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from foodtracker_app.db.database import get_async_session


@pytest.mark.asyncio
async def test_get_async_session_returns_session():
    session_gen = get_async_session()
    session = await session_gen.__anext__()
    assert isinstance(session, AsyncSession)
    await session.close()
