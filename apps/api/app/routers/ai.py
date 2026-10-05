from fastapi import APIRouter, Depends

from ..config import get_settings
from ..schemas import AiRequest
from ..security import require_staff
from ..services import ai

router = APIRouter(prefix="/api/ai", tags=["ai"])
settings = get_settings()


@router.get("/status")
def ai_status():
    return ai.status(settings)


@router.post("/assist", dependencies=[Depends(require_staff)])
async def ai_assist(body: AiRequest):
    return await ai.run_task(settings, body.task, body.text, body.language, body.target_language)
