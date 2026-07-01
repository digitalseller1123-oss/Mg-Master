"""MongoDB connection and helpers."""
import os
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from typing import Optional

_client: Optional[AsyncIOMotorClient] = None
_db = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    return _client


def get_db():
    global _db
    if _db is None:
        _db = get_client()[os.environ["DB_NAME"]]
    return _db


def oid(s: str) -> ObjectId:
    try:
        return ObjectId(s)
    except Exception:
        raise ValueError(f"Invalid id: {s}")


def serialize(doc: dict) -> dict:
    """Convert ObjectId/datetime in a Mongo doc to JSON-serializable values."""
    if doc is None:
        return None
    out = {}
    for k, v in doc.items():
        if k == "_id":
            out["id"] = str(v)
        elif isinstance(v, ObjectId):
            out[k] = str(v)
        elif isinstance(v, list):
            out[k] = [
                serialize(x) if isinstance(x, dict) else (str(x) if isinstance(x, ObjectId) else x)
                for x in v
            ]
        elif isinstance(v, dict):
            out[k] = serialize(v)
        else:
            out[k] = v
    return out
