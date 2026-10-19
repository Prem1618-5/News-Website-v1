"""Uploads from the Newsroom (photos, video, voice recordings) and serving them at /media/.

Files are checked by their first bytes, not by the name or the browser's claim, stored under
MEDIA_DIR/uploads/<year>/<month>/<random>.<ext> and never executed or rendered as HTML.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, UploadFile
from fastapi.responses import FileResponse

from ..config import MEDIA_DIR
from ..database import DB
from ..models import MediaAsset
from ..ratelimit import Limiter
from ..security import CurrentStaff

router = APIRouter(tags=["media"])
UPLOADS = MEDIA_DIR / "uploads"
MB = 1024 * 1024
LIMITS = {"image": 15 * MB, "audio": 60 * MB, "video": 250 * MB}
_uploads = Limiter(120, "Too many uploads in a few minutes. Wait a moment and try again.")


def sniff(head: bytes) -> tuple[str, str, str] | None:
    """(kind, mime, extension) from a file's first bytes, or None for anything we do not accept."""
    if head.startswith(b"\xff\xd8\xff"):
        return "image", "image/jpeg", "jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image", "image/png", "png"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return "image", "image/webp", "webp"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return "image", "image/gif", "gif"
    if head[4:8] == b"ftyp":
        brand = head[8:12]
        if brand in (b"M4A ", b"M4B "):
            return "audio", "audio/mp4", "m4a"
        if brand in (b"heic", b"heix", b"mif1", b"heif"):
            return None  # iPhone HEIC: browsers cannot show it; the Newsroom converts photos to JPEG first
        if brand.startswith(b"qt"):
            return "video", "video/quicktime", "mov"
        return "video", "video/mp4", "mp4"
    if head.startswith(b"\x1a\x45\xdf\xa3"):
        # WebM is used for both screen/camera video and voice notes; the caller says which.
        return "video", "video/webm", "webm"
    if head.startswith(b"OggS"):
        return "audio", "audio/ogg", "ogg"
    if head.startswith(b"ID3") or head[:2] in (b"\xff\xfb", b"\xff\xf3", b"\xff\xf2"):
        return "audio", "audio/mpeg", "mp3"
    if head[:4] == b"RIFF" and head[8:12] == b"WAVE":
        return "audio", "audio/wav", "wav"
    return None


@router.post("/api/desk/media", status_code=201)
async def upload(file: UploadFile, db: DB, actor: CurrentStaff, audio: bool = False):
    _uploads.check(actor.staff_id)
    head = await file.read(64)
    found = sniff(head)
    if not found:
        raise HTTPException(415, "Use a JPEG, PNG, WebP or GIF photo, an MP4/WebM/MOV video or an audio clip.")
    kind, mime, ext = found
    if audio and ext == "webm":
        kind, mime = "audio", "audio/webm"
    limit = LIMITS[kind]
    now = datetime.now(timezone.utc)
    rel = f"uploads/{now:%Y}/{now:%m}/{uuid.uuid4().hex}.{ext}"
    target = MEDIA_DIR / rel
    target.parent.mkdir(parents=True, exist_ok=True)
    size = len(head)
    try:
        with target.open("wb") as out:
            out.write(head)
            while chunk := await file.read(MB):
                size += len(chunk)
                if size > limit:
                    raise HTTPException(413, f"This {kind} is too large (limit {limit // MB} MB).")
                out.write(chunk)
    except HTTPException:
        target.unlink(missing_ok=True)
        raise
    _uploads.hit(actor.staff_id)
    asset = MediaAsset(id=uuid.uuid4().hex[:16], owner_id=actor.staff_id, path=rel, mime=mime, kind=kind, size=size)
    db.add(asset)
    db.commit()
    return {"id": asset.id, "url": f"/media/{rel}", "kind": kind, "mime": mime, "size": size}


@router.api_route("/media/{path:path}", methods=["GET", "HEAD"])
def serve_media(path: str):
    root = MEDIA_DIR.resolve()
    target = (root / path).resolve()
    if target.is_relative_to(root) and target.is_file():
        return FileResponse(target, headers={"Cache-Control": "public, max-age=31536000, immutable", "Content-Disposition": "inline"})
    raise HTTPException(404, "File not found")
