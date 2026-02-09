-- ============================================
-- MySQL 人工输入数据示例
-- ============================================

-- 1. 连接到MySQL数据库
-- 在终端中运行：
-- mysql -u root -p
-- 输入密码后进入MySQL命令行

-- 2. 选择要使用的数据库
USE news_db;

-- 3. 查看所有表
SHOW TABLES;

-- 4. 查看表结构（了解有哪些字段）
DESCRIBE users;
DESCRIBE news;
DESCRIBE favorites;
DESCRIBE history;

-- ============================================
-- 插入单条数据（INSERT）
-- ============================================

-- 示例1：插入用户数据
INSERT INTO users (username, password, email, created_at) 
VALUES ('test_user', '123456', 'test@example.com', NOW());

-- 示例2：插入新闻数据
INSERT INTO news (title, content, category_id, author, publish_time) 
VALUES ('今日头条', '这是一条新闻内容...', 1, '新闻编辑', NOW());

-- 示例3：插入收藏数据
INSERT INTO favorites (user_id, news_id, created_at) 
VALUES (1, 1, NOW());

-- 示例4：插入浏览历史
INSERT INTO history (user_id, news_id, view_time) 
VALUES (1, 1, NOW());

-- ============================================
-- 批量插入多条数据（INSERT MULTIPLE）
-- ============================================

-- 批量插入用户
INSERT INTO users (username, password, email, created_at) VALUES
('user1', 'password1', 'user1@example.com', NOW()),
('user2', 'password2', 'user2@example.com', NOW()),
('user3', 'password3', 'user3@example.com', NOW());

-- 批量插入新闻
INSERT INTO news (title, content, category_id, author, publish_time) VALUES
('社会新闻1', '社会新闻内容1...', 2, '编辑A', NOW()),
('科技新闻1', '科技新闻内容1...', 7, '编辑B', NOW()),
('体育新闻1', '体育新闻内容1...', 6, '编辑C', NOW());

-- ============================================
-- 查看已插入的数据（SELECT）
-- ============================================

-- 查看所有用户
SELECT * FROM users;

-- 查看所有新闻
SELECT * FROM news;

-- 查看特定条件的数据
SELECT * FROM users WHERE username = 'test_user';
SELECT * FROM news WHERE category_id = 1;

-- ============================================
-- 更新数据（UPDATE）
-- ============================================

-- 更新用户信息
UPDATE users SET email = 'newemail@example.com' WHERE id = 1;

-- 更新新闻标题
UPDATE news SET title = '新标题' WHERE id = 1;

-- ============================================
-- 删除数据（DELETE）
-- ============================================

-- 删除特定数据
DELETE FROM users WHERE id = 1;

-- 清空表（谨慎使用！）
-- DELETE FROM news;

-- ============================================
-- 常用查询命令
-- ============================================

-- 查看表中有多少条数据
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM news;

-- 查看最新的5条新闻
SELECT * FROM news ORDER BY publish_time DESC LIMIT 5;

-- 查看特定分类的新闻
SELECT * FROM news WHERE category_id = 1 ORDER BY publish_time DESC;

-- 查看用户的收藏列表
SELECT n.* FROM news n 
INNER JOIN favorites f ON n.id = f.news_id 
WHERE f.user_id = 1;

-- ============================================
-- 注意事项
-- ============================================

-- 1. 如果字段设置了 NOT NULL，必须提供值
-- 2. 如果字段有 AUTO_INCREMENT，不需要手动设置ID
-- 3. 如果字段有 DEFAULT 值，可以不提供该字段
-- 4. 日期字段可以使用 NOW() 函数自动获取当前时间
-- 5. 字符串要用单引号 '' 包裹
-- 6. 数字可以直接写，不需要引号
