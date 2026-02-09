# Redis缓存快速入门

## 📚 快速开始

### 1. 安装Redis

#### macOS:
```bash
brew install redis
brew services start redis
```

#### Ubuntu/Linux:
```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

#### Windows:
下载 Redis for Windows 或使用 WSL

### 2. 安装Python Redis客户端

```bash
pip install redis
```

### 3. 测试Redis连接

```bash
# 测试Redis是否运行
redis-cli ping
# 应该返回: PONG
```

---

## 📝 代码示例

### 基础使用（复制即可用）

```python
# config/redis_config.py
import redis
import json

class RedisCache:
    def __init__(self):
        self.client = redis.Redis(
            host='localhost',
            port=6379,
            decode_responses=True
        )
    
    def get(self, key: str):
        """从Redis获取数据"""
        value = self.client.get(key)
        if value:
            return json.loads(value)
        return None
    
    def set(self, key: str, value: dict, timeout: int = 300):
        """存入Redis（默认5分钟过期）"""
        value_str = json.dumps(value, ensure_ascii=False)
        self.client.setex(key, timeout, value_str)

# 创建实例
redis_cache = RedisCache()
```

```python
# routers/news.py
from config.redis_config import redis_cache

@app.get("/api/news/list")
def get_news_list(category_id: int, db: Session = Depends(get_db)):
    # 1. 生成缓存键
    cache_key = f"news:list:{category_id}"
    
    # 2. 检查缓存
    cached = redis_cache.get(cache_key)
    if cached:
        return {"data": cached, "from_cache": True}
    
    # 3. 查询数据库
    news = db.query(News).all()
    
    # 4. 存入缓存
    redis_cache.set(cache_key, news, timeout=300)
    
    # 5. 返回数据
    return {"data": news, "from_cache": False}
```

---

## ✅ 关键点

1. **生成缓存键**：`cache_key = f"news:list:{category_id}"`
2. **检查缓存**：`cached = redis_cache.get(cache_key)`
3. **存入缓存**：`redis_cache.set(cache_key, data, timeout=300)`
4. **清除缓存**：`redis_cache.delete(cache_key)`（数据更新时）

---

## 🎯 使用场景

- ✅ 新闻列表（经常查询）
- ✅ 新闻详情（不常变化）
- ✅ 用户信息（相对固定）
- ❌ 实时数据（需要实时性）
