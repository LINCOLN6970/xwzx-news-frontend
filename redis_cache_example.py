"""
Redis缓存使用示例
展示如何在FastAPI中使用Redis缓存
"""

# ========== 1. 安装Redis和Python客户端 ==========
"""
安装步骤：
1. 安装Redis服务器：
   - macOS: brew install redis
   - Ubuntu: apt-get install redis-server
   - Windows: 下载Redis for Windows

2. 启动Redis：
   - macOS/Linux: redis-server
   - Windows: redis-server.exe

3. 安装Python Redis客户端：
   pip install redis
"""


# ========== 2. 配置Redis连接 ==========
# config/redis_config.py

import redis
import json
from typing import Optional

class RedisCache:
    """Redis缓存工具类"""
    
    def __init__(self):
        # 连接Redis服务器
        self.client = redis.Redis(
            host='localhost',    # Redis服务器地址
            port=6379,           # Redis端口（默认6379）
            db=0,                # 数据库编号（0-15）
            decode_responses=True,  # 自动解码（返回字符串而不是bytes）
            socket_connect_timeout=5,  # 连接超时
            socket_timeout=5     # 操作超时
        )
    
    def get(self, key: str) -> Optional[dict]:
        """从Redis获取数据"""
        try:
            value = self.client.get(key)
            if value:
                return json.loads(value)  # JSON字符串转为字典
            return None
        except Exception as e:
            print(f"Redis获取数据失败: {e}")
            return None
    
    def set(self, key: str, value: dict, timeout: int = 300):
        """存入Redis（默认5分钟过期）"""
        try:
            value_str = json.dumps(value, ensure_ascii=False)  # 字典转JSON字符串
            self.client.setex(key, timeout, value_str)  # 存入并设置过期时间
            return True
        except Exception as e:
            print(f"Redis存入数据失败: {e}")
            return False
    
    def delete(self, key: str):
        """删除缓存"""
        try:
            self.client.delete(key)
            return True
        except Exception as e:
            print(f"Redis删除数据失败: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """检查缓存是否存在"""
        try:
            return self.client.exists(key) > 0
        except Exception as e:
            print(f"Redis检查数据失败: {e}")
            return False

# 创建全局Redis实例
redis_cache = RedisCache()


# ========== 3. 在API中使用Redis缓存 ==========
# routers/news.py

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from config.database import get_db
from config.redis_config import redis_cache
from models.news import News
from schemas.news import NewsResponse
import time

router = APIRouter()

# ========== 示例1：简单的缓存检查（推荐）==========

@app.get("/api/news/list")
def get_news_list(
    category_id: int = 1,
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db)
):
    """
    获取新闻列表（带缓存）
    
    流程：
    1. 检查Redis缓存
    2. 有缓存 → 直接返回（快！）
    3. 没有缓存 → 查询数据库 → 存入缓存 → 返回
    """
    
    # ========== 步骤1：生成缓存键 ==========
    cache_key = f"news:list:category_{category_id}:page_{page}:size_{page_size}"
    
    # ========== 步骤2：检查Redis缓存 ==========
    cached_data = redis_cache.get(cache_key)
    if cached_data:
        # 缓存命中！直接返回（快！）
        print("从缓存读取数据（快！）")
        return {
            "code": 200,
            "data": cached_data,
            "from_cache": True  # 标记数据来自缓存
        }
    
    # ========== 步骤3：缓存未命中，查询数据库 ==========
    print("缓存未命中，查询数据库...")
    
    # 计算分页
    offset = (page - 1) * page_size
    
    # 查询数据库
    news_list = db.query(News).filter(
        News.category_id == category_id
    ).offset(offset).limit(page_size).all()
    
    # 转换为字典格式
    news_data = [{
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "category_id": news.category_id,
        "publish_time": news.publish_time.isoformat() if news.publish_time else None
    } for news in news_list]
    
    # ========== 步骤4：存入Redis缓存 ==========
    result_data = {"list": news_data, "total": len(news_data)}
    redis_cache.set(cache_key, result_data, timeout=300)  # 缓存5分钟
    print("数据已存入缓存")
    
    # ========== 步骤5：返回数据 ==========
    return {
        "code": 200,
        "data": result_data,
        "from_cache": False  # 标记数据来自数据库
    }


# ========== 示例2：新闻详情缓存 ==========

@app.get("/api/news/detail")
def get_news_detail(id: int, db: Session = Depends(get_db)):
    """
    获取新闻详情（带缓存）
    """
    
    # 生成缓存键
    cache_key = f"news:detail:{id}"
    
    # 检查缓存
    cached_news = redis_cache.get(cache_key)
    if cached_news:
        return {
            "code": 200,
            "data": cached_news,
            "from_cache": True
        }
    
    # 查询数据库
    news = db.query(News).filter(News.id == id).first()
    
    if not news:
        return {"code": 404, "message": "新闻不存在"}
    
    # 转换为字典
    news_data = {
        "id": news.id,
        "title": news.title,
        "content": news.content,
        "category_id": news.category_id,
        "author": news.author,
        "publish_time": news.publish_time.isoformat() if news.publish_time else None
    }
    
    # 存入缓存（1小时，因为详情不经常变化）
    redis_cache.set(cache_key, news_data, timeout=3600)
    
    return {
        "code": 200,
        "data": news_data,
        "from_cache": False
    }


# ========== 示例3：缓存装饰器（更优雅的方式）==========

from functools import wraps

def cache_result(timeout: int = 300, key_prefix: str = ""):
    """
    缓存装饰器
    
    使用示例：
    @cache_result(timeout=300, key_prefix="news")
    def get_news_list(...):
        ...
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # 生成缓存键
            cache_key = f"{key_prefix}:{func.__name__}:{args}:{kwargs}"
            
            # 检查缓存
            cached_result = redis_cache.get(cache_key)
            if cached_result:
                print(f"缓存命中: {cache_key}")
                return cached_result
            
            # 执行函数（查询数据库）
            result = func(*args, **kwargs)
            
            # 存入缓存
            redis_cache.set(cache_key, result, timeout=timeout)
            print(f"数据已缓存: {cache_key}")
            
            return result
        return wrapper
    return decorator


# 使用装饰器
@app.get("/api/news/categories")
@cache_result(timeout=3600, key_prefix="news")  # 缓存1小时
def get_categories(db: Session = Depends(get_db)):
    """获取新闻分类（使用装饰器缓存）"""
    categories = db.query(Category).all()
    
    category_list = [{
        "id": cat.id,
        "name": cat.name
    } for cat in categories]
    
    return {
        "code": 200,
        "data": category_list
    }


# ========== 示例4：清除缓存（数据更新时）==========

@app.post("/api/news/add")
def create_news(news_data: NewsCreate, db: Session = Depends(get_db)):
    """
    创建新闻（需要清除相关缓存）
    """
    
    # 创建新闻
    new_news = News(**news_data.dict())
    db.add(new_news)
    db.commit()
    db.refresh(new_news)
    
    # ========== 清除相关缓存 ==========
    # 1. 清除新闻列表缓存（这个分类的列表已过期）
    category_id = news_data.category_id
    # 清除该分类的所有分页缓存（可以使用模式匹配）
    # 实际项目中可以使用 redis.keys() 或 redis.delete() 批量删除
    
    # 简单方式：清除常见分页的缓存
    for page in range(1, 6):  # 清除前5页的缓存
        cache_key = f"news:list:category_{category_id}:page_{page}:size_10"
        redis_cache.delete(cache_key)
    
    print(f"已清除分类 {category_id} 的列表缓存")
    
    return {
        "code": 200,
        "message": "创建成功",
        "data": {"id": new_news.id}
    }


@app.put("/api/news/{id}")
def update_news(id: int, news_data: NewsUpdate, db: Session = Depends(get_db)):
    """
    更新新闻（需要清除相关缓存）
    """
    
    # 更新新闻
    news = db.query(News).filter(News.id == id).first()
    if not news:
        return {"code": 404, "message": "新闻不存在"}
    
    # 记录旧的分类ID（用于清除缓存）
    old_category_id = news.category_id
    
    # 更新数据
    for key, value in news_data.dict(exclude_unset=True).items():
        setattr(news, key, value)
    
    db.commit()
    db.refresh(news)
    
    # ========== 清除相关缓存 ==========
    # 1. 清除新闻详情缓存
    redis_cache.delete(f"news:detail:{id}")
    
    # 2. 清除旧的分类列表缓存
    for page in range(1, 6):
        cache_key = f"news:list:category_{old_category_id}:page_{page}:size_10"
        redis_cache.delete(cache_key)
    
    # 3. 如果分类改变了，清除新分类的列表缓存
    if news.category_id != old_category_id:
        for page in range(1, 6):
            cache_key = f"news:list:category_{news.category_id}:page_{page}:size_10"
            redis_cache.delete(cache_key)
    
    print(f"已清除新闻 {id} 的相关缓存")
    
    return {
        "code": 200,
        "message": "更新成功"
    }


@app.delete("/api/news/{id}")
def delete_news(id: int, db: Session = Depends(get_db)):
    """
    删除新闻（需要清除相关缓存）
    """
    
    # 获取新闻信息（用于清除缓存）
    news = db.query(News).filter(News.id == id).first()
    if not news:
        return {"code": 404, "message": "新闻不存在"}
    
    category_id = news.category_id
    
    # 删除新闻
    db.delete(news)
    db.commit()
    
    # ========== 清除相关缓存 ==========
    # 1. 清除新闻详情缓存
    redis_cache.delete(f"news:detail:{id}")
    
    # 2. 清除列表缓存
    for page in range(1, 6):
        cache_key = f"news:list:category_{category_id}:page_{page}:size_10"
        redis_cache.delete(cache_key)
    
    print(f"已清除新闻 {id} 的相关缓存")
    
    return {
        "code": 200,
        "message": "删除成功"
    }


# ========== 示例5：批量清除缓存（管理员功能）==========

@app.post("/api/cache/clear")
def clear_cache(pattern: str = "*"):
    """
    清除缓存（管理员功能）
    
    参数：
    - pattern: 缓存键模式，如 "news:*" 清除所有新闻缓存
    """
    try:
        if pattern == "*":
            # 清除所有缓存（谨慎使用！）
            redis_cache.client.flushdb()
            return {"code": 200, "message": "已清除所有缓存"}
        else:
            # 根据模式清除
            keys = redis_cache.client.keys(pattern)
            if keys:
                redis_cache.client.delete(*keys)
                return {
                    "code": 200,
                    "message": f"已清除 {len(keys)} 个缓存",
                    "pattern": pattern
                }
            return {"code": 200, "message": "没有匹配的缓存"}
    except Exception as e:
        return {"code": 500, "message": f"清除缓存失败: {str(e)}"}


# ========== 示例6：检查Redis连接状态 ==========

@app.get("/api/cache/status")
def get_cache_status():
    """
    检查Redis连接状态
    """
    try:
        # 尝试ping Redis
        redis_cache.client.ping()
        
        # 获取Redis信息
        info = redis_cache.client.info()
        
        return {
            "code": 200,
            "status": "connected",
            "redis_version": info.get("redis_version"),
            "used_memory": info.get("used_memory_human"),
            "connected_clients": info.get("connected_clients")
        }
    except Exception as e:
        return {
            "code": 500,
            "status": "disconnected",
            "error": str(e)
        }


# ========== 完整的使用示例 ==========

"""
使用步骤：

1. 确保Redis服务器运行：
   redis-server

2. 在代码中导入和使用：
   from config.redis_config import redis_cache

3. 在API函数中：
   - 生成缓存键
   - 检查缓存
   - 有缓存 → 直接返回
   - 没有缓存 → 查询数据库 → 存入缓存 → 返回

4. 数据更新时：
   - 清除相关缓存

5. 测试：
   - 第一次请求：从数据库读取（慢）
   - 第二次请求：从缓存读取（快！）
"""
