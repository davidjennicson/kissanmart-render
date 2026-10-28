from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import computed_field


class Settings(BaseSettings):
    app_name: str = "kissanmart-backend"
    debug: bool = True
    api_v1_str: str = "/api/v1"
    secret_key: str = "kissanmart-super-secret-key-for-maharashtra-agritech"

    # Database configuration
    database_url: str = "sqlite:///./app.db"

    # Default state constraint
    default_state: str = "Maharashtra"
    default_state_code: int = 27

    # CORS origins
    backend_cors_origins: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,*"

    # Gemma AI Call Agent
    gemma_api_key: str | None = None
    gemma_api_url: str = "https://generativelanguage.googleapis.com/v1beta/models/gemma-2-9b-it:generateContent"
    gemma_model: str = "gemma-2-9b-it"

    # Frontend Dist Directory (optional override)
    frontend_dist_dir: str | None = None

    @computed_field
    @property
    def cors_origins(self) -> list[str]:
        if not self.backend_cors_origins or self.backend_cors_origins == "*":
            return ["*"]
        return [origin.strip() for origin in self.backend_cors_origins.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
