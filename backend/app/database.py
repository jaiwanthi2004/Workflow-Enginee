import os
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

# Load .env from the backend directory (parent of this file's directory)
_env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(_env_path)

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")


def get_supabase() -> Client:
    """Create and return a Supabase client instance."""
    return create_client(SUPABASE_URL, SUPABASE_KEY)


supabase: Client = get_supabase()
