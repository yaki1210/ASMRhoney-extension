# ASMRHoney Theater — 后续计划

Chrome/Edge MV3 扩展：访问 `asmrhoney.com` 时整页接管，用原站 JSON / CDN，自绘沉浸播放台。广告、Fluid Player、popunder 一律不加载。

当前版本 **v0.6.0**。本地预览：`npm run dev` → `http://localhost:5173/`。扩展：`npm run build:ext` → 加载 `dist-ext/`。

v0.4 的浏览壳、按日期分组的历史、本机收藏已经在用。v0.5 补上搜索结果页、合集、收藏播放列表、首页分区和音频目录。v0.6 补上合集里这一集的评论、创作者的中文 / 非中文，以及自绘的音频播放页。**不实施账号、不同步云端、不发评论。** 下面「三」里还没做的项（卡片日期、空标签隐藏、近义合并）仍然没做。

---

## 已定方向

- 接管方式：content script 盖住原站 DOM，URL 仍是站点真实路径。
- 播放页：播放器居中；评论 / 相关 / 创作者走右侧层叠抽屉。
- 浏览页：左侧栏导航（首页 / 片库 / 创作者 / 音频 / 历史 / 收藏），顶栏只留品牌和搜索。
- 浏览器：先 Chrome / Edge MV3。不上架也可以，本地加载 `dist-ext/`。
- 数据：目录、播放量、评论读取继续用原站接口。身份和观看记录只存在本机。
- 账号 / 云同步：不做。
- 发评论：本期只读，不写。

---

## 现在已经有的

- 播放页 `/clip/:slug/`、`/en/clip/:slug/`：自绘控件、键盘、清晰度、倍速、循环、睡眠定时、进度记忆、后台听。
- 右侧抽屉栈：评论（`GET /api/comments`）、相关视频、创作者作品（最新 / 播放 / 时长 / 评论排序）。
- 顶栏评论气泡；`mj` 评论默认折叠。
- 首页 `/`：最新网格，分区为全部 / 中文区 / 日韩区 / 欧美区（`/?region=zh|jp-kr|western`，按创作者地区）。片库同样先选地区，再在这个范围里做分类和标签筛选（`/asmr/?region=jp-kr`）。
- 历史 `/history/`：按今天 / 昨天 / 日期分组，卡片带 24 小时时间。
- 收藏 `/favorites/`：本机 `ahx.favorites`，导入导出 JSON。播放全部走 `/favorites/play/`，正序 / 倒序 / 随机。
- 搜索：⌘K / `/` 仍是建议叠层。输入后直接回车进入 `/search/?q=`，可按标签、时长、上传时间筛选，并按上传时间、播放量、时长排序。点建议行仍打开那一条。
- 合集 `/collection/:slug/`：视频合集列表播放（正序 / 倒序 / 随机，播完自动下一条）。评论请求的是正在播的那一集，不是合集地址。桌面端评论按钮在顶栏右上角；手机端返回在画面左上角，评论在右上角。图片合集（如 `maimy-topless-ppv`）只看图。`/clip/{创作者}-collection/` 和笔误 `cpllection` 也会进合集。
- 创作者目录 `/creators/`：搜索框右侧是全部 / 中文 / 非中文。只有 `creatorGroup === "zh"` 算中文，没标分组的算非中文。
- 音频 `/audio/`：读 `/data/audio.json`，中文音声 / 日语音声。专辑和创作者页是封面、播放全部和曲目。底部是自绘播放条（上一首 / 播放 / 下一首、进度、音量），月亮按钮可在 15 / 30 / 60 分钟后暂停。手机端播放条分三行，专辑标题最多三行。
- 手机端点画面：控制栏藏着时，第一下只把进度条和设置叫出来，不暂停。鼠标点击仍是播放/暂停。
- 本机进度 `ahx.progress.{slug}`（`t` / `dur` / `updatedAt`）。续播仍跳过少于 5 秒或已看完（≥95%）。
- 扩展已在 Chrome（测试版）和 Edge 上加载 `dist-ext/` 验证过接管、收藏和历史。

---

## 一、插件化

目标：`npm run build:ext` 产出可在 `chrome://extensions` 「加载已解压的扩展程序」的目录，打开 `https://asmrhoney.com/clip/...` 就是 Theater。

### 构建

- `vite.extension.config.ts` 把 `src/content/inject.ts` 打成 IIFE `dist-ext/content.js`，CSS 抽成 `dist-ext/content.css`。
- `closeBundle` 已复制 `manifest.json`、`rules.json`。要核对：
  - IIFE 里 Preact + 样式都被打进去，页面不依赖 `chrome-extension://` 的 ES module（MAIN world 没有 `chrome.runtime`）。
  - `content.css` 文件名和 manifest 的 `"css": ["content.css"]` 一致。

### 接管时序（上站时必须成立）

1. `run_at: document_start` + MAIN world：立刻给 `html` 加遮罩，避免原站闪一下。
2. `declarativeNetRequest` 拦住 `app.js`、原站 CSS、Fluid Player、广告脚本、popunder、`/ad-frames/*`。
3. 读 `window.__ASMR_INITIAL_CLIP_DATA__` 做首屏，没有再 fetch `/data/clips/{slug}.json`。
4. 挂 `#ahx-root`，原 DOM 全部藏住。

漏拦任何一条原站 JS，两套播放器会抢 `<video>`。第 0 次真机加载就要在 Network 里确认 `app.js` / fluidplayer / magsrv 是 blocked。

### 存储

开发预览和上站后都用页面源的 `localStorage`（MAIN world 就是 `asmrhoney.com`）。v0.4 历史也走同一套 `ahx.progress.*`，不加 `chrome.storage`、不做跨设备。

### 验收

1. 未加载扩展：原站照常。
2. 加载 `dist-ext/` 后打开任意 `/clip/{slug}/`：无原 topbar、无广告、无 Fluid 皮肤。
3. 播放、切相关、评论抽屉、刷新续播都可用。
4. 打开 `/`、`/creators/`：Theater 浏览页，DNR 仍然拦原站 JS。

---

## 二、当前路由（v0.4）

| 原站路径 | 现在的行为 | v0.4 |
|---|---|---|
| `/clip/:slug/`、`/en/clip/:slug/` | 沉浸播放台；无片库按钮；相关竖卡；点标签进片库 | meta 露出日期 |
| `/`、`/en/` | 侧栏 + 最新网格 + 地区分区 | 保持。查找走顶栏搜索 |
| `/?q=`、`/search/?q=` | 搜索结果页；叠层回车也进这里 | 已做 |
| `/creators/` | 创作者目录，全部 / 中文 / 非中文 | 侧栏入口，页本身保留 |
| `/creators/:slug/` | 头像标题 + 首页同款竖卡，排序保留 | 保留 |
| `/asmr/` 等分类 | 片库页 + 预设过滤 | 侧栏「片库」落地，分类 URL 仍挂这里 |
| `/history/`、`/en/history/` | 本机观看历史，按日期分组 | 保持 |
| `/favorites/`、`/favorites/play/` | 本机收藏；播放全部 | 保持 |
| `/collection/:slug/` | 视频列表播放，评论跟当前这一集；或图片合集 | 保持 |
| `/audio/`、`/audio/album/:slug/`、`/audio/creator/:slug/` | 音频目录，以及带播放条的专辑 / 创作者页 | 保持 |
| `/download/:slug/` | 占位 | 更后一期 |

---

## 三、v0.4 讨论结论

### 1. 发评论：只显示

播放页已经能读评论、分页、时间戳跳转、折叠 `mj`、顶栏计数。缺的是发表。

原站没有账号。评论 `GET /api/comments` 只有 `id / nickname / body / created_at`。`app.js` 里找不到发评 POST；`POST /api/event` 是 D1 分析，不能当评论接口。本期也不做账号。

自建一套发表会和原站评论分裂成两份；去猜一个没有文档的 POST 容易写坏。**v0.4 保持只读。** 以后若摸清原站 POST（昵称表单 + CSRF），再单独开一期，仍然不绑我们自己的登录。

### 2. 播放页去掉「片库」按钮（已做）

播放页顶栏只留：品牌、搜索、评论气泡、相关。`LibraryOverlay` 已删。

点视频下方标签：有对应分类的进该分类 URL（如 `nsfw` → `/adult-asmr/`），其余进 `/asmr/?tag={slug}` 并预选该芯片。离开播放器；mini player 仍是更后一期。

### 3. 相关列表缩略图加大（已做）

相关列表改成首页同款竖卡。桌面右侧栏 312px（封面约 280px）、一列大图；≤1099px 相关区两列。创作者抽屉仍用紧凑横条。卡片日期仍待做。

### 4. 左侧栏，拆开首页和片库

侧栏和顶栏已经分开。首页是最新网格，片库才带分类和标签筛选。

YouTube 式浏览壳（已做）：顶栏横贯全宽，菜单按钮在「首页」图标上方，单行标志 + ASMRHoney 在按钮右侧。展开或收起不移动按钮和标志；展开后侧栏宽度刚好包住这组标志。宽屏收成仅图标，≤720px 同一按钮拉出带文字的抽屉。

```
[ ≡  ASMRHoney ]          [ 搜索框 ]
[ 首页 ]
[ 片库 ]
[ 创作者 ]
[ 历史 ]                  [ 当前页 ]
```

- **侧栏**承担「首页 / 片库 / 创作者 / 历史」。播放页不要侧栏，保持剧场。
- **顶栏**浏览页只留菜单、单行品牌和搜索。
- **首页 `/`**：最新网格。不放继续观看，不放分类快捷，不放标签筛选。查找走顶栏搜索。
- **片库**：分类切换（`/asmr/`、`/sensual-asmr/` 等）+ 完整标签组。按类翻在这里，不在首页再放一套。
- **创作者**：现有 `/creators/`。
- **历史**：见第 6 节。

片库页使用分类切换和完整标签组。首页不再嵌这套筛选。

窄屏抽屉和宽屏图标轨都已接上菜单按钮。

### 5. 搜索变成独立页面

现在的命令面板把「建议」和「结果」混在一起，能力已经超过一块 overlay 该承担的。

- 顶栏搜索框、⌘K、`/` 仍弹出建议层：最近搜索、创作者捷径、边打边出的前几条。
- **输入关键词后按 Enter**（或点「搜索 xxx」）进入搜索页。URL 继续用原站习惯 `/?q=`，或改成更干净的 `/search/?q=`（实施时二选一，默认倾向 `/search/?q=`，避免和首页抢 query）。
- 搜索页 = 结果网格 + 与片库同一套筛选（关键词 AND 标签）。排序沿用最新 / 播放 / 时长。
- 建议层里点某条视频仍可直达播放页。

### 6. 只做本机历史

沿用 `ahx.progress.{slug}`，整理成可浏览的列表，不新开后端。

```
WatchRecord { slug, t, dur, updatedAt }
```

- 侧栏「历史」进入 `/history/`：按 `updatedAt` 倒序；未看完 / 已看完分开。看完阈值 ≥95%。桌面两列大横条（缩略图约 320px），窄屏一列。创作者页用首页竖卡；播放页抽屉仍是紧凑横条。
- 首页不放继续观看条。历史和播放器续播读同一份 `ahx.progress.*`。
- 进度仍由播放器定时写入。
- 不做收藏、账号、云同步、`chrome.storage.sync`。
- `localhost:5173` 和 `asmrhoney.com` 仍是两份本地数据，可接受。

### 7. 标签标记不全

这是原站数据问题，筛选芯片本身已经列出 `triggers.json` 全部 36 个 slug。对过 `clips-search.json`（2718 条）：

- 片子用到的 distinct 标签 31 个，没有芯片之外的私货 slug。
- 5 个芯片当前 0 条：`brushing` `paper` `keyboard` `rain` `fire`。
- 近义重复：`kiss` / `kissing`（26 vs 3），`vision` / `visual_triggers`（88 vs 2）。
- 231 条只有 1 个标签（常见只有 `nsfw`），标题里明显还有舔耳、角色等。
- 88 条既没有 `sfw` 也没有 `nsfw`。
- `sfw`∩`nsfw` 同时打上的有 553 条，分级并不互斥。

v0.4 能做的：

- 芯片按当前目录命中数隐藏 0 条，避免空筛。
- 近义 slug 在筛选里当一组（勾选亲吻同时匹配 `kiss` 与 `kissing`）。
- 搜索继续打标题 / 别名，用来补标签缺口。
- 卡片和播放页把已有标签、日期露出来（播放页标签已有）。

不在客户端猜标，不写回原站。

### 8. 露出上传日期

`publishedAt` 早就在列表和详情里，现在只拿来排序。卡片和播放页 meta 都没有日期。

- 播放页创作者 / 播放量旁边显示具体日期（`2026-10-02` 这种，不要只用「n 小时前」）。
- 首页 / 片库 / 搜索 / 相关 / 历史卡片加一行短日期。
- 评论时间继续用相对时间 `formatWhen`。给视频另写一个 `formatDate(publishedAt)`。

---

## 四、更后一期（v0.4 之后）

- **插件真机**：`build:ext`、DNR 实测、遮罩无闪。
- **mini player**：离开 clip 路径时声音不断。
- **字幕**：`subtitleTracks` 接到 `<track>` / overlay。
- **音频**：`/data/audio.json`。
- **下载抽屉**：原片 / 480p 直链。
- **i18n 切换**：顶栏切语言。
- **发评论**：仅当原站 POST 摸清之后。
- **收藏 / 账号同步**：明确不做，除非以后单独拍板。

---

## 原站接口（只读）

**目录**

- `GET /data/clips-meta.json`
- `GET /data/clips-page-{n}.json`
- `GET /data/clips-search.json` — 全量列表
- `GET /data/clips/{slug}.json` — 含 `videoUrl` / `video480Url` / `backgroundAudioUrl` / `subtitleTracks` / `publishedAt` / `tags`
- `GET /data/streamers.json`
- `GET /data/triggers.json` — 36 个官方标签
- `GET /data/audio.json`

**动态**

- `GET /api/play-counts`
- `GET /api/comments?clip={slug}&before={id}` — 只读
- `POST /api/event` — 埋点；`clip_play_start` 会回写播放量
- `GET /download/{slug}/`
- `GET /api/ad-config` — 接管后不请求

没有登录、没有 `/api/me`、没有观看历史接口、没有已文档化的发评 POST。列表项没有 `videoUrl`，开播必须拉详情。

---

## 建议实施顺序（v0.4）

1. 播放页删除片库按钮；相关列表改大卡。（已做）
2. 播放页和卡片露出 `publishedAt`。
3. 本机历史页 + 浏览壳左侧栏（首页 / 片库 / 创作者 / 历史）；顶栏去掉片库、创作者。首页不放继续观看条。（已做）
4. 首页与片库拆开：首页是最新网格，片库承担分类 URL 和标签筛选。（已做）
5. 搜索建议层 + Enter 进搜索页，结果可再筛选。
6. 标签：藏空芯片、近义合并。
7. 插件真机、mini player、字幕、音频……回到「更后一期」。

每一项做完用 `git tag` 记一版。

---

## 不做

- 改 CDN / 转 HLS / 自适应码率（源站只有 mp4 + 480p）。
- 重做广告变现。
- 用扩展去补丁原站 DOM（始终是替换）。
- Firefox、上架商店：需单独拍板。
- 账号系统、云同步、把进度 POST 到 `/api/event`。
- v0.4 发评论、自建评论后端。
- 猜测或改写原站片子标签。
- 收藏（未列入本期）。
