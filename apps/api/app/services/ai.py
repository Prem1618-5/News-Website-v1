"""Pluggable AI assistance for the Newsroom.

Any OpenAI-compatible chat endpoint works. Groq and NVIDIA NIM are pre-wired: set GROQ_API_KEY or
NVIDIA_API_KEY and the features switch on. Without a key, `status()` reports `enabled: false` and
the Newsroom hides AI buttons. Keys never leave the server.
"""
from dataclasses import dataclass

import httpx
from fastapi import HTTPException

from ..config import Settings


@dataclass(frozen=True)
class Provider:
    name: str
    base_url: str
    api_key: str
    model: str


PROMPTS: dict[str, str] = {
    "headline": (
        "You are a news sub-editor. Suggest 3 clear, accurate headlines under 90 characters for the article. "
        "No clickbait, no exaggeration. Return one headline per line, no numbering."
    ),
    "summary": "Write a one-sentence standfirst (under 200 characters) that gives readers the essential context. Return only the sentence.",
    "proofread": (
        "Proofread the text for spelling, grammar and punctuation only. Keep the meaning, voice and facts unchanged. "
        "Return only the corrected text."
    ),
    "translate": "Translate the text faithfully for a news audience. Keep names and numbers unchanged. Return only the translation.",
    "tags": "Suggest up to 6 short topic tags for the article. Return them comma-separated, lowercase.",
}

LANGUAGE_NAME = {"en": "English", "hi": "Hindi (Devanagari script)"}


def resolve_provider(settings: Settings) -> Provider | None:
    preferred = settings.ai_provider.lower().strip()
    candidates: list[Provider] = []
    if settings.groq_api_key:
        candidates.append(Provider("groq", "https://api.groq.com/openai/v1", settings.groq_api_key, settings.groq_model))
    if settings.nvidia_api_key:
        candidates.append(Provider("nvidia", "https://integrate.api.nvidia.com/v1", settings.nvidia_api_key, settings.nvidia_model))
    if settings.openai_compatible_base_url and settings.openai_compatible_api_key and settings.openai_compatible_model:
        candidates.append(Provider("custom", settings.openai_compatible_base_url.rstrip("/"), settings.openai_compatible_api_key, settings.openai_compatible_model))
    if preferred:
        for provider in candidates:
            if provider.name == preferred:
                return provider
    return candidates[0] if candidates else None


def status(settings: Settings) -> dict:
    provider = resolve_provider(settings)
    return {
        "enabled": provider is not None,
        "provider": provider.name if provider else None,
        "model": provider.model if provider else None,
        "tasks": list(PROMPTS) if provider else [],
    }


async def run_task(settings: Settings, task: str, text: str, language: str, target_language: str | None) -> dict:
    provider = resolve_provider(settings)
    if provider is None:
        raise HTTPException(503, "AI is not set up. Add GROQ_API_KEY or NVIDIA_API_KEY to the API environment.")
    system = PROMPTS[task]
    if task == "translate":
        target = target_language or ("hi" if language == "en" else "en")
        system += f" Translate into {LANGUAGE_NAME[target]}."
    else:
        system += f" Respond in {LANGUAGE_NAME.get(language, 'English')}."
    body = {
        "model": provider.model,
        "temperature": 0.2,
        "max_tokens": 1200,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": text[:20000]}],
    }
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(
                f"{provider.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {provider.api_key}", "Content-Type": "application/json"},
                json=body,
            )
    except httpx.RequestError:
        raise HTTPException(503, "The AI provider could not be reached. Try again shortly.")
    if response.status_code == 429:
        raise HTTPException(429, "The AI provider is rate limiting requests. Try again in a minute.")
    if response.status_code >= 400:
        raise HTTPException(502, "The AI provider rejected the request.")
    try:
        data = response.json()
    except ValueError:
        raise HTTPException(502, "The AI provider sent an unreadable answer. Try again.")
    output = (data.get("choices") or [{}])[0].get("message", {}).get("content", "").strip()
    suggestions = [line.strip(" -•\t") for line in output.splitlines() if line.strip()] if task == "headline" else []
    tags = [t.strip().lower() for t in output.split(",") if t.strip()][:6] if task == "tags" else []
    return {"task": task, "provider": provider.name, "output": output, "suggestions": suggestions[:3], "tags": tags}
