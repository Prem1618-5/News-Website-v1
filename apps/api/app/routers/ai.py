from fastapi import APIRouter

from ..config import get_settings
from ..ratelimit import Limiter
from ..schemas import AiRequest
from ..security import CurrentStaff
from ..services import ai

router = APIRouter(prefix="/api/ai", tags=["ai"])
settings = get_settings()
# Per person, per 5 minutes: plenty for writing, and a cap on what one account can spend.
_assists = Limiter(30, "You have used the AI helper a lot in the last few minutes. Try again shortly.")


@router.get("/status")
def ai_status():
    # Which features are on; the provider and model stay private.
    return {k: v for k, v in ai.status(settings).items() if k in ("enabled", "tasks")}


@router.post("/assist")
async def ai_assist(body: AiRequest, actor: CurrentStaff):
    _assists.check(actor.staff_id)
    _assists.hit(actor.staff_id)
    return await ai.run_task(settings, body.task, body.text, body.language, body.target_language)
