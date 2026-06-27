# 在 Vercel 上启用持久化存储

本应用默认是「本地优先」：数据存在本地 SQLite 文件 + 本地磁盘。但 Vercel
serverless 文件系统是**只读 + 临时**的，本地存储会丢。为此代码做了**双模式**改造：

| 环境变量存在 | 走云端存储 | 不存在则回退 |
|---|---|---|
| `TURSO_DATABASE_URL` (+ `TURSO_AUTH_TOKEN`) | 数据库 → Turso / libSQL | 本地 SQLite 文件 |
| `BLOB_READ_WRITE_TOKEN` | 上传文件 → Vercel Blob | 本地磁盘 |

> 本地开发和打包的 `.exe` **不用设这些变量**，行为完全不变。

---

## 一、数据库：Turso

1. 注册 <https://turso.tech>（GitHub 一键登录，有免费额度）。
2. 安装 CLI 并创建数据库（任选其一）：
   - 网页控制台点 **Create Database**；或
   - CLI：
     ```bash
     turso db create gowork
     turso db show gowork --url           # 得到 TURSO_DATABASE_URL（libsql://...）
     turso db tokens create gowork        # 得到 TURSO_AUTH_TOKEN
     ```
3. 不用手动建表——应用启动时会自动 `CREATE TABLE IF NOT EXISTS`。

## 二、文件：Vercel Blob

1. Vercel 项目 → **Storage** → **Create** → **Blob**。
2. 把这个 Blob store **Connect** 到 `gowork-web` 项目。
3. 连接后，`BLOB_READ_WRITE_TOKEN` 会自动注入到项目环境变量（无需手填）。

## 三、把数据库变量填进 Vercel

项目 → **Settings → Environment Variables**，给 **Production** 和 **Preview**
都加：

| Name | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://gowork-xxxxx.turso.io` |
| `TURSO_AUTH_TOKEN` | `eyJ...`（上一步生成的 token） |

（`BLOB_READ_WRITE_TOKEN` 已由 Storage 连接自动注入，不用手加。）

## 四、重新部署 + 验证

改了环境变量后触发一次重新部署（推一个 commit，或在 Vercel 点 Redeploy）。
验证：

```bash
# 建一张卡
curl -X POST https://<你的域名>/api/cards \
  -H "Content-Type: application/json" \
  -d '{"company":"测试","role":"计划经理"}'

# 列出卡片，刷新/等冷启动后再列一次，数据应仍在
curl https://<你的域名>/api/cards
```

如果两次之间数据没丢，说明持久化生效了。

---

## 备注
- 删除卡片时会一并删掉它的附件行；Blob 上的文件目前不会级联删除（会留下孤儿
  文件，不影响功能）。如需严格清理可后续再加。
- 想公开访问（不登录）：Settings → Deployment Protection → 关闭 Vercel
  Authentication。
