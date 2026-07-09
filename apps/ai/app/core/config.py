from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    database_url: str = "postgresql://sprintio:sprintio@localhost:5432/sprintio"
    redis_url: str = "redis://localhost:6379"
    ai_model: str = "llama3"
    openai_api_key: str = ""
    jwt_secret: str = "dev-secret"
    sentry_dsn: str = ""


settings = Settings()
