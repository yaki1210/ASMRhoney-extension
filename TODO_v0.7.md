# ASMRhoney v0.7 — 浏览与列表 UX

基线：`v0.6.0` / 分支 `feature/v0.7-browse-ux`  
仓库：`yaki1210/ASMRhoney-extension`  
本地：`E:\project\ASMRhoney`

## 版本管理

- [x] 从 `master`（v0.6.0）拉出 `feature/v0.7-browse-ux`
- [ ] 功能合入前按项小提交；完成后打 `v0.7.0` 并合并回 `master`
- [ ] 根目录截图 / `dist-ext.zip` 继续不进 git（保持 untracked）

## 功能 TODO

### 1. 首页 / 片库翻页（替换「加载更多」）

现状：`Home` / `Library` / `SearchPage` 用 `PAGE=48` +「加载更多」切片，默认按新→旧。

目标：

- 列表按 **老 → 新** 排序后分页，**每一页内容固定**（页码对应稳定区间）
- UI **第一页 = 页号最大的那一页**（最新那一侧）
- 若最后一页（最老一侧之外、最新那一截）条数 `< pageSize`，则与 **页号第二大** 合并显示，使首屏条数落在 **`[pageSize, 2*pageSize - 1]`**
  - 例：`pageSize=50`，总数 230 → 固定页为 50+50+50+50+30；展示时把 30 并进上一页 → 首屏显示 80，其后每页 50
- `pageSize` 可配置（已定 **50**（2026-11-03））
- 片库在筛选 / 排序变更时重算页界；URL 可带 `?page=`（待实施时定）

### 2. 列表删除 + 拖拽调序（已实现：收藏页 + 收藏播放队列）

优先落点：**收藏页** + **播放列表侧栏**（`FavoritesPage` / `PlaylistView` 的 `playlist-list`）

- 可删除列表中的视频（收藏已有爱心移除；播放列表补显式删除）
- 可拖动调整顺序，并持久化到本机存储（收藏顺序现跟 `savedAt`；需改为显式 order）

### 3. 慢加载：锚点 + 显式加载态（已实现：catalogStatus + GridLoading）

现状：`catalog.length === 0` 才显示「加载中」；`fetchCatalog` / `ensureFullCatalog` 用「更长目录优先保留」合并，切换后容易 **先闪旧封面**。

目标：

- 找稳定锚点（路由 `kind`+筛选 key、或 catalog 版本号 / `loadingCatalog`）
- 打开或切换导致目录未就绪时，**盖一层骨架 / spinner**，不要继续画上一批卡片
- 封面 `img` 在换源前清空或加 `key`，避免浏览器复用旧图

### 4. 首页 / 片库点封面 → 默认新窗口（已实现）

- `ClipGrid`（及首页 / 片库入口）点击封面 / 卡片：`window.open` 或 `<a target="_blank" rel="noopener">` 打开播放页
- 创作者名点击仍可本页跳转（保持现行为，除非你另要求）

### 5. 网页全屏（已实现）

- 浏览壳或播放台增加「网页全屏」按钮（`document.documentElement.requestFullscreen`）
- 与播放器本身的视频全屏区分清楚

### 6. 滚动条 + 进度条样式（已实现）

- 自定义页面 / 抽屉 / 列表 **scrollbar**（webkit + `scrollbar-color`）
- 重做播放器 **seek / 进度条** 视觉（替换当前默认观感），音频条一并统一

## 实施顺序（建议）

1. 翻页模型 + pageSize=50（实现中/已提交待验）  
2. 加载锚点（避免假数据闪现）  
3. 封面新窗口  
4. 列表删除 / 拖拽  
5. 网页全屏  
6. 滚动条 + 进度条样式  

**本批已全部落地到本机分支 eature/v0.7-browse-ux（翻页 / 加载锚点 / 新窗口 / 网页全屏 / 滚动条进度条 / 列表删除拖拽）。未推送、未升版本号。
**

### 补丁：页码输入跳转 + 新标签返回修复（已实现）

