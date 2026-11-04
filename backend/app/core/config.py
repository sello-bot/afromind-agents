from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Afromind Agents"
    environment: str = "development"

    cors_origins: str = (
        "http://localhost:3000,"
        "https://verbose-umbrella-g4w7pp4p9v5cpvj7-3000.app.github.dev"
    )

    default_ai_provider: str = "groq"

    groq_api_key: str | None = None
    groq_base_url: str = "https://api.groq.com/openai/v1"
    groq_default_model: str = "openai/gpt-oss-20b"

    openai_api_key: str | None = None
    openai_base_url: str = "https://api.openai.com/v1"
    openai_default_model: str = "gpt-4o-mini"

    ai_timeout_seconds: float = 60.0

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )


settings = Settings()
