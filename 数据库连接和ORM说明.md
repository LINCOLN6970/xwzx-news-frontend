# 数据库连接和ORM框架说明

## 1. `database': 'news_db'` 什么时候被调用和触发？

### 调用时机

```
应用启动时：
├─ 读取配置文件 config/db_conf.py
├─ 创建数据库引擎（Engine）
├─ 建立连接池
└─ 但此时还没有真正连接数据库

首次API请求时：
├─ 用户访问 /api/news/list
├─ 创建数据库会话（Session）
├─ 从连接池获取连接
├─ 连接到 news_db 数据库 ← 这里才真正连接！
└─ 执行SQL查询

每次API请求：
├─ 创建新会话
├─ 使用连接池中的连接
├─ 操作 news_db 数据库
└─ 请求结束后关闭会话，连接返回池中
```

### 完整流程示例

```python
# ========== 1. 应用启动时（config/db_conf.py） ==========
DATABASE_URL = "mysql+pymysql://root:password@localhost:3306/news_db"
# ↑ 这里只是配置，还没有连接！

# 创建引擎（但还没连接）
engine = create_engine(DATABASE_URL)
# ↑ 这时候读取了 'news_db'，但数据库还没有被访问


# ========== 2. 第一次API请求时（真正连接） ==========
@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):
    # 当执行到这行时：
    news = db.query(News).all()
    # ↑ 这里才真正连接到 news_db 数据库！
    # 执行 SQL: SELECT * FROM news
    return {"data": news}
```

### 触发时机总结

| 时机 | 是否连接数据库 | 说明 |
|------|----------------|------|
| **应用启动** | ❌ 不连接 | 只读取配置，创建引擎 |
| **第一次查询** | ✅ 连接 | 真正连接到 news_db |
| **每次API请求** | ✅ 连接 | 使用连接池，操作数据库 |
| **应用关闭** | ❌ 断开 | 关闭所有连接 |

---

## 2. SQLAlchemy 的作用

### SQLAlchemy = ORM框架（对象关系映射）

```
ORM = Object-Relational Mapping（对象关系映射）
```

### 作用：让Python代码操作数据库，不需要写SQL

#### 不使用SQLAlchemy（原始SQL）：

```python
# 需要写原生SQL
import pymysql

db = pymysql.connect(...)
cursor = db.cursor()

# 必须写SQL语句
sql = "SELECT * FROM news WHERE category_id = %s"
cursor.execute(sql, (1,))
results = cursor.fetchall()

# 还要手动处理结果
news_list = []
for row in results:
    news_list.append({
        'id': row[0],
        'title': row[1],
        'content': row[2]
    })
```

#### 使用SQLAlchemy（ORM方式）：

```python
# 不需要写SQL，直接用Python对象
from sqlalchemy.orm import Session

# 直接用Python代码
news = db.query(News).filter(News.category_id == 1).all()
# ↑ SQLAlchemy自动转换成SQL：SELECT * FROM news WHERE category_id = 1

# 结果直接是对象，不用手动处理
for item in news:
    print(item.title)  # 直接访问属性
```

### SQLAlchemy 的主要功能

```
SQLAlchemy
├─ 1. 定义数据模型（表结构）
│   └─ 用Python类代替SQL的CREATE TABLE
│
├─ 2. 查询数据（Query）
│   └─ 用Python代码代替SQL的SELECT
│
├─ 3. 插入/更新/删除（CRUD）
│   └─ 用Python对象操作代替SQL的INSERT/UPDATE/DELETE
│
└─ 4. 关系映射（Relationships）
    └─ 自动处理表之间的关联
```

### 什么时候用SQLAlchemy？

✅ **总是用**（在Python后端项目中）

```
原因：
├─ 更安全（防止SQL注入）
├─ 更简洁（不用写SQL）
├─ 更灵活（代码更易维护）
└─ 更强大（支持复杂查询）
```

---

## 3. BaseModel 的作用

### BaseModel 有两种含义：

### 类型1：SQLAlchemy 的 Base（ORM模型基类）

```python
# models/base.py
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()
# ↑ 这是SQLAlchemy的Base，用于定义数据库表

# 使用方式：
from models.base import Base

class News(Base):  # 继承Base
    __tablename__ = 'news'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    # ↑ 这个类就对应数据库中的 news 表
```

**作用**：
- 定义数据库表结构（用Python类）
- 将Python类映射到数据库表
- 自动生成SQL语句

**什么时候用**：
- 定义数据模型（models/news.py）
- 对应数据库表结构

### 类型2：Pydantic 的 BaseModel（数据验证模型）

```python
# schemas/news.py
from pydantic import BaseModel

class NewsCreate(BaseModel):  # 继承Pydantic的BaseModel
    title: str
    content: str
    category_id: int
    # ↑ 用于验证API接收的数据格式
```

**作用**：
- 验证API请求/响应的数据格式
- 自动类型转换
- 自动生成API文档

**什么时候用**：
- 定义API的输入输出格式（schemas/news.py）
- FastAPI自动验证请求数据

### 两种BaseModel的区别

| 类型 | SQLAlchemy Base | Pydantic BaseModel |
|------|----------------|-------------------|
| **位置** | `models/` 目录 | `schemas/` 目录 |
| **用途** | 定义数据库表 | 验证API数据 |
| **对应** | 数据库表结构 | API请求/响应格式 |
| **文件** | `models/news.py` | `schemas/news.py` |

### 完整示例对比

```python
# ========== models/news.py（SQLAlchemy Base）==========
from sqlalchemy import Column, Integer, String, Text
from models.base import Base  # SQLAlchemy的Base

class News(Base):  # 对应数据库表
    __tablename__ = 'news'
    
    id = Column(Integer, primary_key=True)
    title = Column(String(200))
    content = Column(Text)
    # ↑ 这定义了数据库表的结构


# ========== schemas/news.py（Pydantic BaseModel）==========
from pydantic import BaseModel  # Pydantic的BaseModel

class NewsCreate(BaseModel):  # API请求格式
    title: str
    content: str
    # ↑ 这定义了API接收数据的格式


# ========== routers/news.py（使用两者）==========
@app.post("/api/news/add")
def create_news(news_data: NewsCreate, db: Session = Depends(get_db)):
    # news_data: NewsCreate ← 用Pydantic验证输入
    # db: Session ← 用SQLAlchemy操作数据库
    
    # 创建数据库对象（SQLAlchemy模型）
    new_news = News(
        title=news_data.title,  # 从Pydantic模型获取
        content=news_data.content
    )
    
    # 保存到数据库（SQLAlchemy操作）
    db.add(new_news)
    db.commit()
    
    return {"message": "创建成功"}
```

---

## 完整数据流程

```
1. 前端请求
   POST /api/news/add
   { "title": "新闻标题", "content": "内容" }
        ↓

2. FastAPI接收
   routers/news.py
        ↓

3. Pydantic验证（BaseModel）
   schemas/news.py
   NewsCreate(title="新闻标题", content="内容")
        ↓

4. 业务逻辑
   crud/news.py
        ↓

5. SQLAlchemy操作（Base）
   models/news.py
   News(title="新闻标题", content="内容")
        ↓

6. 数据库连接（触发 news_db）
   config/db_conf.py
   database='news_db' ← 这里被使用！
        ↓

7. MySQL数据库
   news_db.news表
   INSERT INTO news (title, content) VALUES (...)
        ↓

8. 返回结果
   前端收到响应
```

---

## 总结

### 1. `database': 'news_db'` 什么时候被调用？
- ✅ **应用启动时**：读取配置，创建引擎
- ✅ **首次API请求时**：真正连接到 news_db 数据库
- ✅ **每次查询时**：使用连接操作数据库

### 2. SQLAlchemy 的作用
- ✅ **ORM框架**：用Python代码操作数据库，不用写SQL
- ✅ **总是用**：在Python后端项目中都应该使用

### 3. BaseModel 的作用
- ✅ **SQLAlchemy Base**：定义数据库表结构（models/）
- ✅ **Pydantic BaseModel**：验证API数据格式（schemas/）
- ✅ **两个都要用**：一个管数据库，一个管API验证
