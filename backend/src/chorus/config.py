from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    groq_api_key: str = ""
    tavily_api_key: str = ""
    together_api_key: str = ""
    langsmith_api_key: str = ""
    langsmith_tracing: bool = False
    allowed_origins: list[str] = ["http://localhost:3000"]
    max_concurrent_runs: int = 4
    run_timeout_seconds: int = 120
    max_fetch_bytes: int = 2_000_000
    
settings = Settings()