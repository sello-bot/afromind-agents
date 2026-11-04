import json
import httpx

from app.core.config import settings


SUPPORTED_MODELS = {
    "groq": {
        "openai/gpt-oss-20b",
        "llama-3.3-70b-versatile",
    },
    "openai": {
        "gpt-4o-mini",
    },
}


def get_provider_config(provider: str):
    selected = provider.strip().lower()

    if selected == "groq":
        return (
            settings.groq_api_key,
            settings.groq_base_url,
            settings.groq_default_model,
        )

    if selected == "openai":
        return (
            settings.openai_api_key,
            settings.openai_base_url,
            settings.openai_default_model,
        )

    raise RuntimeError(
        f"Unsupported AI provider: {selected}"
    )


def generate_ai_response(
    instructions: str,
    user_input: dict,
    model: str | None = None,
    temperature: float = 0.3,
    max_tokens: int = 1000,
    provider: str | None = None,
) -> dict:
    selected_provider = (
        provider or settings.default_ai_provider
    ).strip().lower()

    api_key, base_url, default_model = (
        get_provider_config(selected_provider)
    )

    selected_model = model or default_model

    if selected_model not in SUPPORTED_MODELS[selected_provider]:
        raise RuntimeError(
            f"Model '{selected_model}' is not supported "
            f"by provider '{selected_provider}'."
        )

    if not api_key:
        raise RuntimeError(
            f"{selected_provider.title()} is not configured. "
            f"Set {selected_provider.upper()}_API_KEY "
            "in the backend environment."
        )

    payload = {
        "model": selected_model,
        "messages": [
            {"role": "system", "content": instructions},
            {
                "role": "user",
                "content": (
                    "Process the following workflow input and "
                    "return a useful response:\n"
                    + json.dumps(
                        user_input,
                        ensure_ascii=False,
                        indent=2,
                    )
                ),
            },
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    url = f"{base_url.rstrip('/')}/chat/completions"

    try:
        response = httpx.post(
            url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=settings.ai_timeout_seconds,
        )
        response.raise_for_status()

    except httpx.TimeoutException as exc:
        raise RuntimeError(
            "AI provider request timed out."
        ) from exc

    except httpx.HTTPStatusError as exc:
        raise RuntimeError(
            f"{selected_provider.title()} returned "
            f"HTTP {exc.response.status_code}."
        ) from exc

    except httpx.RequestError as exc:
        raise RuntimeError(
            f"Could not connect to {selected_provider.title()}."
        ) from exc

    try:
        data = response.json()
        content = data["choices"][0]["message"]["content"]

        if not isinstance(content, str) or not content.strip():
            raise ValueError("Empty AI response.")

    except (ValueError, KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(
            "AI provider returned an unexpected response format."
        ) from exc

    return {
        "mode": "ai",
        "provider": selected_provider,
        "model": selected_model,
        "response": content.strip(),
        "usage": data.get("usage"),
    }
