# FastAPI 的 Depends 详解

## 📚 快速理解

```
Depends = 依赖注入（Dependency Injection）
作用：自动提供需要的对象（如数据库连接）
```

---

## 1. Depends 是什么？

### Depends = 依赖注入工具

```python
from fastapi import Depends

# 使用方式
def my_function(db: Session = Depends(get_db)):
    # ↑ Depends 会自动调用 get_db()，然后把结果传给 db
    pass
```

**作用**：自动调用函数，并把结果作为参数传递

---

## 2. 为什么需要 Depends？

### 场景：每个API都需要数据库连接

#### ❌ 不用 Depends（繁琐的方式）：

```python
# 每个函数都要手动获取数据库连接
@app.get("/api/news/list")
def get_news():
    db = SessionLocal()  # ← 手动创建
    try:
        news = db.query(News).all()
        return news
    finally:
        db.close()  # ← 手动关闭

@app.get("/api/news/detail")
def get_news_detail(id: int):
    db = SessionLocal()  # ← 又要手动创建
    try:
        news = db.query(News).filter(News.id == id).first()
        return news
    finally:
        db.close()  # ← 又要手动关闭

# 问题：每个函数都要重复这些代码！
```

#### ✅ 用 Depends（优雅的方式）：

```python
# 定义一个获取数据库的函数
def get_db():
    db = SessionLocal()  # 创建数据库连接
    try:
        yield db  # 返回数据库连接
    finally:
        db.close()  # 自动关闭

# API函数中使用 Depends
@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):  # ← Depends自动调用get_db()
    news = db.query(News).all()
    return news
    # ↑ 不需要手动创建和关闭，Depends自动处理！

@app.get("/api/news/detail")
def get_news_detail(id: int, db: Session = Depends(get_db)):
    news = db.query(News).filter(News.id == id).first()
    return news
    # ↑ 同样，自动处理！
```

**优势**：
- ✅ 代码复用（不用重复写创建/关闭的代码）
- ✅ 自动管理（自动创建和关闭连接）
- ✅ 更安全（确保连接总是被正确关闭）

---

## 3. Depends 的工作流程

### 完整流程：

```
1. API请求到达
   GET /api/news/list
        ↓

2. FastAPI 看到参数中有 Depends
   def get_news(db: Session = Depends(get_db)):
        ↓

3. FastAPI 自动调用 get_db()
   get_db() → 创建数据库连接
        ↓

4. get_db() 返回 db（数据库连接）
   yield db
        ↓

5. db 传递给 get_news 函数
   def get_news(db: Session = ...):
        ↓

6. 函数使用 db 执行查询
   news = db.query(News).all()
        ↓

7. 函数返回结果
   return news
        ↓

8. FastAPI 执行 get_db() 的清理代码
   finally:
       db.close()  # 自动关闭连接
```

---

## 4. 实际代码示例

### 示例1：数据库连接（最常用）

```python
# ========== 定义依赖函数 ==========
from sqlalchemy.orm import Session

def get_db():
    """
    获取数据库连接
    Depends会自动调用这个函数
    """
    db = SessionLocal()  # 创建连接
    try:
        yield db  # 返回连接，函数暂停在这里
        # ↑ yield 是关键！允许函数暂停和恢复
    finally:
        db.close()  # 函数结束后自动执行关闭

# ========== 使用 Depends ==========
@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):
    # ↑ FastAPI自动调用 get_db()，获取 db
    # 不需要手动写 db = get_db()
    
    news = db.query(News).all()
    return {"data": news}
    # ↑ 函数结束后，get_db() 的 finally 块自动执行
    # 数据库连接自动关闭


@app.post("/api/news/add")
def create_news(news_data: NewsCreate, db: Session = Depends(get_db)):
    # ↑ 可以同时使用多个 Depends
    # news_data: NewsCreate（自动验证）
    # db: Session = Depends(get_db)（自动获取数据库连接）
    
    new_news = News(**news_data.dict())
    db.add(new_news)
    db.commit()
    return {"message": "创建成功"}
```

### 示例2：用户认证（另一个常用场景）

```python
# ========== 定义依赖函数 ==========
def get_current_user(token: str = Depends(get_token)):
    """
    获取当前登录用户
    先获取token，再验证用户
    """
    user = verify_token(token)
    return user

# ========== 使用 Depends ==========
@app.get("/api/user/info")
def get_user_info(current_user: User = Depends(get_current_user)):
    # ↑ Depends可以嵌套！get_current_user 内部也会调用 Depends(get_token)
    return {"user": current_user}
```

### 示例3：多个依赖

```python
@app.get("/api/news/list")
def get_news(
    page: int = 1,
    page_size: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # ↑ 可以同时使用多个 Depends
    # 1. Depends(get_db) → 获取数据库连接
    # 2. Depends(get_current_user) → 获取当前用户
    
    news = db.query(News).limit(page_size).offset((page-1)*page_size).all()
    return {"data": news, "user": current_user}
```

---

## 5. Depends 的工作原理

### yield 关键字的作用：

```python
def get_db():
    print("1. 创建数据库连接")
    db = SessionLocal()
    
    try:
        print("2. 返回数据库连接")
        yield db  # ← 函数暂停在这里，返回 db
        # ↑ 调用者可以使用 db
        # ↑ 函数保持打开状态
        
    finally:
        print("3. 关闭数据库连接")
        db.close()  # ← 函数结束后自动执行
```

### 执行顺序：

```
1. FastAPI 调用 get_db()
2. 执行到 yield db → 返回 db，函数暂停
3. db 传递给 API 函数（如 get_news）
4. API 函数使用 db 执行操作
5. API 函数返回结果
6. get_db() 的 finally 块执行 → 关闭连接
```

---

## 6. 为什么用 yield 而不是 return？

### ❌ 用 return（错误）：

```python
def get_db():
    db = SessionLocal()
    return db
    # ↑ 函数立即结束，无法执行清理代码
    db.close()  # ← 这行代码永远不会执行！

# 问题：数据库连接永远不会被关闭！
```

### ✅ 用 yield（正确）：

```python
def get_db():
    db = SessionLocal()
    try:
        yield db  # ← 暂停在这里，等待函数结束
    finally:
        db.close()  # ← 函数结束后执行

# 优点：确保连接总是被关闭
```

---

## 7. Depends 的常见用途

### 1. 数据库连接（最常用）

```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):
    news = db.query(News).all()
    return news
```

### 2. 用户认证

```python
def get_current_user(token: str = Header(None)):
    if not token:
        raise HTTPException(401)
    user = verify_token(token)
    return user

@app.get("/api/user/info")
def get_user_info(user: User = Depends(get_current_user)):
    return {"user": user}
```

### 3. 权限检查

```python
def require_admin(user: User = Depends(get_current_user)):
    if not user.is_admin:
        raise HTTPException(403, "需要管理员权限")
    return user

@app.delete("/api/news/{id}")
def delete_news(id: int, admin: User = Depends(require_admin)):
    # ↑ 只有管理员才能删除
    db.delete_news(id)
    return {"message": "删除成功"}
```

### 4. 参数验证和转换

```python
def get_pagination(page: int = Query(1), size: int = Query(10)):
    if page < 1:
        raise HTTPException(400, "页码必须大于0")
    return {"page": page, "size": size}

@app.get("/api/news/list")
def get_news(pagination: dict = Depends(get_pagination)):
    page = pagination["page"]
    size = pagination["size"]
    # ...
```

---

## 8. Depends 的优势总结

```
✅ 代码复用
   - 不用在每个函数中重复写创建/关闭连接的代码

✅ 自动管理
   - 自动创建和清理资源（如数据库连接）

✅ 依赖嵌套
   - 一个依赖可以依赖另一个依赖

✅ 易于测试
   - 可以轻松替换依赖（如用测试数据库替换真实数据库）

✅ 代码清晰
   - 函数参数明确说明需要什么依赖
```

---

## 9. 完整示例

```python
# ========== config/database.py ==========
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

engine = create_engine("mysql://root:password@localhost:3306/news_db")
SessionLocal = sessionmaker(bind=engine)


# ========== dependencies.py ==========
def get_db():
    """获取数据库连接的依赖"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ========== routers/news.py ==========
from fastapi import Depends
from sqlalchemy.orm import Session

@app.get("/api/news/list")
def get_news_list(db: Session = Depends(get_db)):
    # ↑ FastAPI自动调用 get_db()，获取数据库连接
    news = db.query(News).all()
    return {"data": news}


@app.post("/api/news/add")
def create_news(
    news_data: NewsCreate,
    db: Session = Depends(get_db)
):
    new_news = News(**news_data.dict())
    db.add(new_news)
    db.commit()
    return {"message": "创建成功"}


@app.delete("/api/news/{id}")
def delete_news(id: int, db: Session = Depends(get_db)):
    news = db.query(News).filter(News.id == id).first()
    db.delete(news)
    db.commit()
    return {"message": "删除成功"}
```

---

## 10. 总结

### Depends 是什么？
- **依赖注入工具**：自动提供需要的对象

### Depends 的作用？
- ✅ **自动管理资源**（如数据库连接）
- ✅ **代码复用**（不用重复写创建/关闭代码）
- ✅ **依赖嵌套**（一个依赖可以依赖另一个）

### Depends 的用法？
```python
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/news/list")
def get_news(db: Session = Depends(get_db)):
    # ↑ Depends自动调用get_db()，获取db
    news = db.query(News).all()
    return news
```

### 关键点：
- `yield` 不是 `return`（允许函数暂停和清理）
- `Depends` 自动调用函数并传递结果
- 函数结束后自动执行清理代码

---

## 记忆方法

```
Depends = 依赖注入
作用 = 自动提供需要的对象

就像：
- 你需要数据库连接 → Depends(get_db) 自动给你
- 你需要用户信息 → Depends(get_current_user) 自动给你

不需要手动创建，Depends帮你处理！
```
