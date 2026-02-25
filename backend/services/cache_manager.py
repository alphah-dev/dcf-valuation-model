import json
import logging
from typing import Optional, Any

logger = logging.getLogger(__name__)

TTL_FINANCIALS = 90 * 24 * 3600
TTL_PRICE = 2 * 60
TTL_SEARCH = 3600
TTL_QUALITY = 7 * 24 * 3600


class CacheManager:

    def __init__(self, redis_url: str = "redis://localhost:6379/0"):
        self._client = None
        try:
            import redis as redis_lib
            connection_kwargs = {
                "decode_responses": True,
                "socket_timeout": 5,
                "socket_connect_timeout": 5,
                "retry_on_timeout": True,
            }
            if redis_url.startswith("rediss://"):
                connection_kwargs["ssl_cert_reqs"] = None
            self._client = redis_lib.Redis.from_url(redis_url, **connection_kwargs)
            self._client.ping()
            logger.info("Redis connected")
        except Exception as e:
            logger.warning(f"Redis unavailable, caching disabled: {e}")
            self._client = None

    @property
    def available(self) -> bool:
        return self._client is not None

    def get(self, key: str) -> Optional[Any]:
        if not self._client:
            return None
        try:
            data = self._client.get(key)
            return json.loads(data) if data else None
        except Exception:
            return None

    def set(self, key: str, value: Any, ttl: int = TTL_FINANCIALS):
        if not self._client:
            return
        try:
            self._client.setex(key, ttl, json.dumps(value, default=str))
        except Exception as e:
            logger.warning(f"Cache set failed for {key}: {e}")

    def delete(self, key: str):
        if not self._client:
            return
        try:
            self._client.delete(key)
        except Exception:
            pass

    def flush_ticker(self, ticker: str):
        for prefix in ["financials", "stock", "quality", "dcf"]:
            self.delete(f"{prefix}:{ticker}")

    def get_financials(self, ticker: str):
        return self.get(f"financials:{ticker}")

    def set_financials(self, ticker: str, data: Any):
        self.set(f"financials:{ticker}", data, TTL_FINANCIALS)

    def get_stock(self, ticker: str):
        return self.get(f"stock:{ticker}")

    def set_stock(self, ticker: str, data: Any):
        self.set(f"stock:{ticker}", data, TTL_PRICE)

    def get_quality(self, ticker: str):
        return self.get(f"quality:{ticker}")

    def set_quality(self, ticker: str, data: Any):
        self.set(f"quality:{ticker}", data, TTL_QUALITY)
