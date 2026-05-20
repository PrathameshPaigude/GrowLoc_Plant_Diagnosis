from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Default to SQLite for local development. 
    # To switch to PostgreSQL later, just change this line in your .env file!
    database_url: str = "sqlite:///./growloc.db"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Check if we are using SQLite so we can add the necessary connect_args
connect_args = {}
if settings.database_url.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(settings.database_url, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
