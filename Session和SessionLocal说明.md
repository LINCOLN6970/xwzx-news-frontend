# Session 和 SessionLocal 详解

## 📚 快速理解

```
Session      = 数据库会话对象（用来操作数据库）
SessionLocal = 会话工厂（用来创建Session对象）
```

---

## 1. 它们是什么？

### Session = 数据库会话对象

```
Session 是一个对象
作用：用来执行数据库操作（增删改查）
```

### SessionLocal = 会话工厂

```
SessionLocal 是一个函数/类
作用：用来创建 Session 对象
```

---

## 2. 形象比喻

```
SessionLocal = 工厂（生产东西的地方）
Session      = 产品（工厂生产出来的东西）

比如：
SessionLocal = 汽车工厂
Session      = 汽车（工厂生产出来的）

每次需要操作数据库时：
1. 用 SessionLocal() 创建一个新的 Session（像生产一辆新汽车）
2. 用这个 Session 操作数据库（开车）
3. 用完关闭 Session（停车）
```

---

## 3. 代码定义

### SessionLocal 的定义：

```python
# config/database.py
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine

# 1. 创建数据库引擎
engine = create_engine("mysql://root:password@localhost:3306/news_db")

# 2. 创建会话工厂（SessionLocal）
SessionLocal = sessionmaker(
    bind=engine,      # 绑定到引擎
    autocommit=False, # 不自动提交
    autoflush=False   # 不自动刷新
)
# ↑ SessionLocal 是一个工厂函数，用来创建 Session

# 3. 使用时，调用 SessionLocal() 创建新的 Session
db = SessionLocal()  # ← 创建一个新的 Session 对象
```

### Session 的类型提示：

```python
from sqlalchemy.orm import Session

def get_db():
    db: Session = SessionLocal()  # ← Session 是类型提示，表示 db 的类型
    # ↑ Session 告诉代码：db 是一个 Session 类型的对象
    try:
        yield db
    finally:
        db.close()
```

---

## 4. 详细对比

| 名称 | 类型 | 作用 | 用法 |
|------|------|------|------|
| **SessionLocal** | 工厂函数 | 创建 Session 对象 | `SessionLocal()` |
| **Session** | 类型/对象 | 操作数据库 | `db.query()`, `db.add()` |

---

## 5. 完整代码示例

### 定义阶段（config/database.py）：

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# ========== 步骤1：创建引擎 ==========
engine = create_engine(
    "mysql+pymysql://root:password@localhost:3306/news_db",
    pool_pre_ping=True
)

# ========== 步骤2：创建会话工厂 ==========
SessionLocal = sessionmaker(
    bind=engine,      # 绑定到数据库引擎
    autocommit=False, # 不自动提交（需要手动 commit）
    autoflush=False   # 不自动刷新
)
# ↑ SessionLocal 是一个工厂，用来创建 Session
```

### 使用阶段（routers/news.py）：

```python
from sqlalchemy.orm import Session
from config.database import SessionLocal

# ========== 创建 Session ==========
def get_db():
    # SessionLocal() 创建一个新的 Session 对象
    db: Session = SessionLocal()
    # ↑ SessionLocal() → 创建 Session 对象
    # ↑ Session 是类型提示，告诉代码 db 的类型
    
    try:
        yield db  # 返回 Session 对象
    finally:
        db.close()  # 关闭 Session


# ========== 使用 Session ==========
@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):
    # ↑ db 是一个 Session 对象
    # ↑ 可以用它来操作数据库
    
    # 使用 Session 查询数据
    news = db.query(News).all()
    # ↑ db.query() 是 Session 的方法
    
    return {"data": news}


@app.post("/api/news/add")
def create_news(news_data: NewsCreate, db: Session = Depends(get_db)):
    # ↑ db 是一个 Session 对象
    
    # 使用 Session 添加数据
    new_news = News(**news_data.dict())
    db.add(new_news)  # ← Session 的方法
    db.commit()       # ← Session 的方法
    
    return {"message": "创建成功"}
```

---

## 6. SessionLocal 的工作原理

### SessionLocal 是什么？

```python
# SessionLocal 是一个 sessionmaker 返回的类
SessionLocal = sessionmaker(bind=engine)

# SessionLocal 可以像类一样使用
db1 = SessionLocal()  # 创建第一个 Session
db2 = SessionLocal()  # 创建第二个 Session
db3 = SessionLocal()  # 创建第三个 Session

# 每个 Session 都是独立的
```

### 为什么需要 SessionLocal？

```
不使用 SessionLocal（错误方式）：
db = Session()  # ❌ 错误！Session 不能直接创建

使用 SessionLocal（正确方式）：
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()  # ✅ 正确！用工厂创建
```

---

## 7. Session 的生命周期

### Session 的生命周期：

```
1. 创建 Session
   db = SessionLocal()  ← 创建新的 Session
        ↓

2. 使用 Session 操作数据库
   news = db.query(News).all()  ← 查询
   db.add(new_news)             ← 添加
   db.commit()                  ← 提交
        ↓

3. 关闭 Session
   db.close()  ← 关闭 Session，释放连接
```

### 重要：每个请求一个 Session

```python
# 请求1
@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):
    # ← 创建 Session 1
    news = db.query(News).all()
    # ← 关闭 Session 1

# 请求2（同时进行）
@app.get("/api/user/info")
def get_user(db: Session = Depends(get_db)):
    # ← 创建 Session 2（独立的）
    user = db.query(User).first()
    # ← 关闭 Session 2

# 每个请求都有自己独立的 Session！
```

---

## 8. Session 的常用方法

### Session 对象可以做什么？

```python
db: Session = SessionLocal()

# ========== 查询操作 ==========
# 查询所有
news = db.query(News).all()

# 查询单个
news = db.query(News).filter(News.id == 1).first()

# 条件查询
news = db.query(News).filter(News.category_id == 1).all()

# ========== 添加操作 ==========
new_news = News(title="新闻标题")
db.add(new_news)        # 添加到会话
db.commit()             # 提交到数据库

# ========== 更新操作 ==========
news = db.query(News).filter(News.id == 1).first()
news.title = "新标题"    # 修改对象属性
db.commit()             # 提交更改

# ========== 删除操作 ==========
news = db.query(News).filter(News.id == 1).first()
db.delete(news)         # 删除对象
db.commit()             # 提交删除

# ========== 回滚操作 ==========
db.rollback()           # 撤销未提交的更改
```

---

## 9. 为什么每个请求需要一个 Session？

### 线程安全：

```
多用户同时访问：
├─ 用户1 → 创建 Session 1 → 操作数据库 → 关闭 Session 1
├─ 用户2 → 创建 Session 2 → 操作数据库 → 关闭 Session 2
└─ 用户3 → 创建 Session 3 → 操作数据库 → 关闭 Session 3

每个用户独立的 Session，不会互相干扰！
```

### 如果不这样做（错误）：

```python
# ❌ 错误：全局 Session
global_db = SessionLocal()

@app.get("/api/news/list")
def get_news():
    news = global_db.query(News).all()  # ❌ 所有请求共享一个Session
    return news

# 问题：
# 1. 多个请求同时使用，会冲突
# 2. 一个请求出错，影响其他请求
# 3. 无法正确提交/回滚事务
```

---

## 10. 完整示例对比

### 完整的定义和使用：

```python
# ========== config/database.py ==========
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# 1. 创建引擎
engine = create_engine("mysql://root:password@localhost:3306/news_db")

# 2. 创建会话工厂
SessionLocal = sessionmaker(bind=engine)
# ↑ SessionLocal 是工厂，用来创建 Session


# ========== dependencies.py ==========
from sqlalchemy.orm import Session
from config.database import SessionLocal

def get_db():
    # SessionLocal() 创建一个新的 Session 对象
    db: Session = SessionLocal()
    # ↑ db 的类型是 Session
    # ↑ SessionLocal() 是调用工厂创建 Session
    
    try:
        yield db  # 返回 Session 对象
    finally:
        db.close()  # 关闭 Session


# ========== routers/news.py ==========
from sqlalchemy.orm import Session
from fastapi import Depends

@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):
    # ↑ db 是一个 Session 对象
    # ↑ 可以用它操作数据库
    
    # Session 的方法
    news = db.query(News).all()
    return {"data": news}
```

---

## 11. 记忆方法

```
SessionLocal = 工厂（制造 Session 的地方）
Session      = 产品（工厂制造出来的对象）

类比：
SessionLocal = 面包店（工厂）
Session      = 面包（产品）

每次需要：
1. 去面包店（SessionLocal）买一个面包（Session）
2. 吃面包（用 Session 操作数据库）
3. 吃完（关闭 Session）
```

---

## 12. 常见问题

### Q1: SessionLocal 和 Session 有什么区别？

```
SessionLocal = 工厂函数（用来创建 Session）
Session      = 对象类型（SessionLocal 创建出来的对象）
```

### Q2: 为什么叫 SessionLocal？

```
SessionLocal = Session + Local（本地）

含义：
- 每个请求创建本地的 Session
- 不共享，每个请求独立
```

### Q3: 可以直接用 Session() 吗？

```python
# ❌ 错误
db = Session()  # Session 不是类，不能直接实例化

# ✅ 正确
db = SessionLocal()  # 用工厂创建
```

---

## 13. 总结

### SessionLocal 是什么？
- **会话工厂**：用来创建 Session 对象的函数/类
- **定义位置**：`config/database.py`
- **创建方式**：`SessionLocal = sessionmaker(bind=engine)`

### Session 是什么？
- **会话对象**：用来操作数据库的对象
- **创建方式**：`db = SessionLocal()`
- **类型提示**：`db: Session`

### 它们的关系？

```
SessionLocal（工厂）
    ↓ 调用
SessionLocal()  ← 创建
    ↓
Session 对象  ← 结果
    ↓ 使用
db.query()  ← 操作数据库
db.add()
db.commit()
    ↓ 关闭
db.close()  ← 清理
```

### 关键点：
- ✅ **SessionLocal** = 工厂（制造 Session）
- ✅ **Session** = 对象（操作数据库）
- ✅ **每个请求** 创建一个新的 Session
- ✅ **用完关闭** Session（释放连接）

---

## 简单记忆

```
SessionLocal = 工厂（生产 Session 的地方）
Session      = 产品（工厂生产的对象）

流程：
1. SessionLocal() → 创建 Session
2. 用 Session 操作数据库
3. db.close() → 关闭 Session
```
