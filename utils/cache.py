import os
import json
from typing import Optional, Any

# Mock de Redis caso não esteja instalado ou configurado
# Em produção, usar: import redis
class SimpleCache:
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL")
        self.client = None
        # if self.redis_url:
        #     import redis
        #     self.client = redis.from_url(self.redis_url)

    def get(self, key: str) -> Optional[Any]:
        if not self.client: return None
        data = self.client.get(key)
        return json.loads(data) if data else None

    def set(self, key: str, value: Any, expire: int = 3600):
        if not self.client: return
        self.client.setex(key, expire, json.dumps(value))

cache = SimpleCache()
