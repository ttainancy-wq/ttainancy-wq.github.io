# Forest English Island · 森林英语岛

儿童英语绘本学习与综合能力训练网页，发布地址：

[https://ttainancy-wq.github.io/](https://ttainancy-wq.github.io/)

## 两个学习系统

- Book Learning：每本绘本独立完成故事导入、核心词、句型、理解、阅读朗读和 Book Challenge。
- Skills Training：只读取 `published` 且孩子已经学习过的绘本，进行听力、阅读、拼读、认词和每日混合训练。
- 句型严格以绘本 JSON 中配置的内容为边界，不会自行加入方位词、动作词或更高阶语法。
- 学过 Brown Bear 与 There Is Thunder 后，会出现 `see / hear` 绘本联想桥。
- 每完成一个阶段都会出现可重复触发的满屏花朵星雨。

内置三本绘本：

1. Brown Bear
2. Rain Rain Go Away
3. There Is Thunder

当前学习边界：Brown Bear 只练颜色、动物和 `see` 问答；Rain 只练歌谣词句；Thunder 聚焦 `thunder / lightning` 与 `see / hear`。

所有页面使用原创 emoji/CSS 场景或家长自行上传的合法图片，不包含未经授权的绘本扫描页。

## Book Studio

进入 `Parent Zone → Book Studio`：

1. 点击“创建新绘本”，或选择一本书后“复制为模板”。
2. 编辑基本信息、页面、核心词、句型、理解题、阅读扩展和拼读目标。
3. 页面和封面可上传本机图片，也可使用 `🌳|🐻|🌼` 形式的原创占位场景。
4. 页面可填写真人朗读 URL，或导入有权使用的短音频；未提供时自动选择设备上质量较高的英语音色。
5. 点击“校验完整性”修复错误。
6. 在“儿童端预览”检查课程。
7. 保存草稿，或发布到儿童端。

Book Studio 数据保存在浏览器 `localStorage`。录音保存在 IndexedDB。换设备前建议导出 JSON。

## 导入与导出

- 导入：选择符合 `src/data/books/book-template.json` 数据结构的 JSON。
- 导出：在 Book Studio 左侧点击“导出 JSON”。
- 模板：`src/data/books/book-template.json` 是完整可填写模板。

## 数据与迁移

- 当前进度键：`forest-english-progress-v4`
- 自定义绘本键：`forest-english-books-v1`
- 旧版 `forest-english-progress-v2` / `v3` 会自动迁移。
- Brown Bear、`rainy` 等旧记录会尽可能映射到新绘本和详细技能字段。

## SessionPlanner

每轮训练开始前一次性生成完整题目计划，约束包括：

- 最近五题不重复正确答案；
- 每个词最多作为正确答案两次；
- 同一类别不连续超过两题；
- 三本绘本尽量均衡；
- 单词、短语、句子交替；
- 正确答案位置不连续相同；
- 未练词优先，高错误词提高权重；
- 错词在 2–4 题后作为复习焦点再次出现，同时避免违反正确答案五题去重。

开发模式可以展开 `Session Distribution Report` 查看分布和违规项。

## 本地开发

```bash
npm install
npm run dev
npm run lint
npm run test
npm run build
```

浏览器 QA（需要本机 Google Chrome）：

```bash
npm run preview -- --host 127.0.0.1 --port 4173
npm run qa:browser
```

## GitHub Pages

本仓库沿用 `main` 分支根目录发布。发布前运行：

```bash
npm run pages:sync
```

命令会：

1. 构建生产版本；
2. 将生产 `index.html` 和 `assets/` 同步到仓库根目录；
3. 生成同内容的 `404.html`；
4. 保留 hash 路由，刷新绘本、训练或家长页面不会出现 404。
