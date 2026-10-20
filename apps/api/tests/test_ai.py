import asyncio

import httpx
import pytest
from fastapi import HTTPException

from app.config import Settings
from app.services import ai


class _FakeResponse:
    def __init__(self, status_code=200, content="", raises=False):
        self.status_code = status_code
        self._content = content
        self._raises = raises

    def json(self):
        if self._raises:
            raise ValueError("bad json")
        return {"choices": [{"message": {"content": self._content}}]}


def _fake_client(response, calls):
    class FakeClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *exc):
            return False

        async def post(self, url, headers=None, json=None):
            calls.append({"url": url, "headers": headers, "json": json})
            if isinstance(response, Exception):
                raise response
            if isinstance(response, list):
                return response.pop(0) if len(response) > 1 else response[0]
            return response

    return FakeClient


@pytest.fixture(autouse=True)
def _clear_cache():
    ai._cache.clear()
    yield
    ai._cache.clear()


def _settings(**env):
    return Settings(_env_file=None, **env)


def run(settings, task="headline", text="Some article text", language="en", target=None):
    return asyncio.run(ai.run_task(settings, task, text, language, target))


def test_no_key_means_off_and_503():
    s = _settings()
    assert ai.status(s)["enabled"] is False
    with pytest.raises(HTTPException) as err:
        run(s)
    assert err.value.status_code == 503


def test_gemini_is_chosen_when_key_is_set_and_preferred_over_groq():
    s = _settings(GEMINI_API_KEY="g", GROQ_API_KEY="q")
    provider = ai.resolve_provider(s)
    assert provider.name == "gemini" and provider.base_url == ai.GEMINI_BASE_URL and provider.model == "gemini-3.5-flash"
    assert ai.status(s)["tasks"] == list(ai.PROMPTS) and "seo" in ai.PROMPTS


def test_ai_provider_setting_can_pick_another_provider():
    s = _settings(GEMINI_API_KEY="g", GROQ_API_KEY="q", AI_PROVIDER="groq")
    assert ai.resolve_provider(s).name == "groq"


def test_request_goes_to_gemini_chat_completions_with_bearer_key(monkeypatch):
    calls = []
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(_FakeResponse(content="Headline one\n- Headline two\nHeadline three\nHeadline four"), calls))
    result = run(_settings(GEMINI_API_KEY="secret-key"))
    assert calls[0]["url"] == f"{ai.GEMINI_BASE_URL}/chat/completions"
    assert calls[0]["headers"]["Authorization"] == "Bearer secret-key"
    assert result["provider"] == "gemini"
    assert result["suggestions"] == ["Headline one", "Headline two", "Headline three"]


@pytest.mark.parametrize(("language", "target", "expected"), [("en", None, "Hindi"), ("hi", None, "English"), ("en", "hi", "Hindi"), ("hi", "en", "English")])
def test_translate_goes_both_ways(monkeypatch, language, target, expected):
    calls = []
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(_FakeResponse(content="translated"), calls))
    result = run(_settings(GEMINI_API_KEY="k"), task="translate", language=language, target=target)
    assert result["output"] == "translated"
    assert f"Translate into {expected}" in calls[0]["json"]["messages"][0]["content"]


def test_gemini_requests_turn_thinking_off_but_other_providers_are_unchanged(monkeypatch):
    calls = []
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(_FakeResponse(content="ok"), calls))
    run(_settings(GEMINI_API_KEY="k"))
    run(_settings(GROQ_API_KEY="q"), text="other text")
    assert calls[0]["json"]["reasoning_effort"] == "none"
    assert "reasoning_effort" not in calls[1]["json"]


def test_one_retry_after_a_high_demand_503(monkeypatch):
    calls = []

    async def no_wait(_seconds):
        return None

    monkeypatch.setattr(ai.asyncio, "sleep", no_wait)
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client([_FakeResponse(status_code=503), _FakeResponse(content="fine")], calls))
    assert run(_settings(GEMINI_API_KEY="k"))["output"] == "fine"
    assert len(calls) == 2


def test_gives_up_after_the_retry(monkeypatch):
    async def no_wait(_seconds):
        return None

    monkeypatch.setattr(ai.asyncio, "sleep", no_wait)
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(_FakeResponse(status_code=503), []))
    with pytest.raises(HTTPException) as err:
        run(_settings(GEMINI_API_KEY="k"))
    assert err.value.status_code == 502


def test_tags_are_split_lowercased_and_capped_at_six(monkeypatch):
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(_FakeResponse(content="Ranchi, Politics,  Water, Roads, Health, Jobs, Extra"), []))
    assert run(_settings(GEMINI_API_KEY="k"), task="tags")["tags"] == ["ranchi", "politics", "water", "roads", "health", "jobs"]


def test_seo_task_returns_the_sentence(monkeypatch):
    calls = []
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(_FakeResponse(content="  Ranchi gets a new water plant.  "), calls))
    assert run(_settings(GEMINI_API_KEY="k"), task="seo")["output"] == "Ranchi gets a new water plant."
    assert "155" in calls[0]["json"]["messages"][0]["content"]


def test_repeat_request_is_served_from_cache(monkeypatch):
    calls = []
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(_FakeResponse(content="once"), calls))
    s = _settings(GEMINI_API_KEY="k")
    assert run(s, task="summary")["output"] == "once"
    assert run(s, task="summary")["output"] == "once"
    assert len(calls) == 1
    run(s, task="summary", text="different text")
    assert len(calls) == 2


@pytest.mark.parametrize(
    ("response", "status"),
    [
        (_FakeResponse(status_code=429), 429),
        (_FakeResponse(status_code=500), 502),
        (_FakeResponse(raises=True), 502),
        (_FakeResponse(content=""), 502),
        (httpx.ConnectError("down"), 503),
    ],
)
def test_provider_failures_map_to_clean_errors(monkeypatch, response, status):
    monkeypatch.setattr(ai.httpx, "AsyncClient", _fake_client(response, []))
    with pytest.raises(HTTPException) as err:
        run(_settings(GEMINI_API_KEY="k"))
    assert err.value.status_code == status
    assert "k" not in err.value.detail.split() and "Bearer" not in err.value.detail
