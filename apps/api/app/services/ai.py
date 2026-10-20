"""Pluggable AI assistance for the Newsroom.

Any OpenAI-compatible chat endpoint works. Gemini (free tier), Groq and NVIDIA NIM are pre-wired: set
GEMINI_API_KEY, GROQ_API_KEY or NVIDIA_API_KEY and the features switch on (Gemini is preferred when
several are set). Without a key, `status()` reports `enabled: false` and the Newsroom hides AI buttons.
Keys never leave the server.
"""
import asyncio
import hashlib
from collections import OrderedDict
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
    "seo": (
        "Write a search-engine meta description for the article: one plain sentence of at most 155 characters "
        "that says what the story is about. No quotes, no clickbait. Return only the sentence."
    ),
}

LANGUAGE_NAME = {"en": "English", "hi": "Hindi (Devanagari script)"}

GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai"

# Repeat requests (same text, same task) are answered from memory so the free tier lasts longer.
_CACHE_SIZE = 256
_cache: "OrderedDict[str, dict]" = OrderedDict()


def _cache_key(provider: Provider, task: str, language: str, target: str | None, text: str) -> str:
    digest = hashlib.sha256(text[:20000].encode("utf-8")).hexdigest()
    return "|".join((provider.name, provider.model, task, language, target or "", digest))


def resolve_provider(settings: Settings) -> Provider | None:
    preferred = settings.ai_provider.lower().strip()
    candidates: list[Provider] = []
    if settings.gemini_api_key:
        candidates.append(Provider("gemini", GEMINI_BASE_URL, settings.gemini_api_key, settings.gemini_model))
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
        raise HTTPException(503, "AI is not set up. Add GEMINI_API_KEY (or GROQ_API_KEY / NVIDIA_API_KEY) to the API environment.")
    system = PROMPTS[task]
    target = None
    if task == "translate":
        target = target_language or ("hi" if language == "en" else "en")
        system += f" Translate into {LANGUAGE_NAME[target]}."
    else:
        system += f" Respond in {LANGUAGE_NAME.get(language, 'English')}."
    key = _cache_key(provider, task, language, target, text)
    if key in _cache:
        _cache.move_to_end(key)
        return dict(_cache[key])
    body = {
        "model": provider.model,
        "temperature": 0.2,
        "max_tokens": 1200,
        "messages": [{"role": "system", "content": system}, {"role": "user", "content": text[:20000]}],
    }
    if provider.name == "gemini":
        # Gemini 3.x thinks by default and the thinking counts against max_tokens, which would cut long translations short.
        body["reasoning_effort"] = "none"
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            for attempt in range(2):
                response = await client.post(
                    f"{provider.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {provider.api_key}", "Content-Type": "application/json"},
                    json=body,
                )
                # Free-tier models answer 503 "high demand" in short spikes; one quick retry usually clears it.
                if response.status_code != 503 or attempt:
                    break
                await asyncio.sleep(1.5)
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
    if not output:
        raise HTTPException(502, "The AI provider sent an empty answer. Try again.")
    result = {"task": task, "provider": provider.name, "output": output, "suggestions": suggestions[:3], "tags": tags}
    _cache[key] = result
    if len(_cache) > _CACHE_SIZE:
        _cache.popitem(last=False)
    return dict(result)
