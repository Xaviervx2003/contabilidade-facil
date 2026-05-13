import os
import json
from typing import Optional, Any

class SimpleCache:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.client = None
        if self.redis_url:
            try:
                import redis
                self.client = redis.from_url(self.redis_url, decode_responses=True, socket_connect_timeout=2)
                self.client.ping()  # valida conexão no startup
            except Exception as e:
                print(f"[cache] Redis indisponível, rodando sem cache: {e}")
                self.client = None

    def get(self, key: str) -> Optional[Any]:
        if not self.client:
            return None
        try:
            data = self.client.get(key)
            return json.loads(data) if data else None
        except Exception:
            return None

    def set(self, key: str, value: Any, expire: int = 3600):
        if not self.client:
            return
        try:
            self.client.setex(key, expire, json.dumps(value, default=str))
        except Exception:
            pass

    def delete(self, key: str):
        if not self.client:
            return
        try:
            self.client.delete(key)
        except Exception:
            pass

cache = SimpleCache()
