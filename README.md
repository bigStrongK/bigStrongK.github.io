# bigStrongK 的技术博客

记录编程实践、问题排查与学习心得。

- [在线博客](https://bigstrongk.github.io/)
- [首篇文章：用 Codex 和 GitHub Pages 上线个人博客](https://bigstrongk.github.io/posts/hello-world/)
- [RSS 订阅](https://bigstrongk.github.io/rss.xml)

基于 [AstroPaper](https://github.com/satnaing/astro-paper)，使用 Markdown 写作，通过 GitHub Actions 发布到 GitHub Pages。支持中文界面、Pagefind 搜索、标签、归档、深浅主题和手机布局。

## 本地运行

准备 Git、Node.js 24 和 pnpm 11.25.0。Node.js 版本与部署流程保持一致；pnpm 版本以 `package.json` 的 `packageManager` 字段为准。

```sh
git clone https://github.com/bigStrongK/bigStrongK.github.io.git
cd bigStrongK.github.io
pnpm install --frozen-lockfile
pnpm run build
pnpm run preview
```

打开终端显示的预览地址。修改内容时可运行 `pnpm run dev`；检查搜索前先运行 `pnpm run build`，生成并同步 Pagefind 索引。

## 写文章

在 `src/content/posts/` 新增 `.md` 文件，按下面的格式填写：

```md
---
title: "一篇技术笔记"
description: "记录一个实际问题及解决办法。"
pubDatetime: 2026-10-14T08:00:00+08:00
tags:
  - 编程
draft: true
featured: false
---

## 遇到的问题

写下现象、操作步骤和验证结果。
```

`pubDatetime` 填写文章的实际发布时间。`draft: true` 表示草稿，不显示在网站上；审阅后改为 `false`。需要进入首页精选时，将 `featured` 设为 `true`。

文章的路径默认由文件名生成，例如 `my-note.md` 对应 `/posts/my-note/`。

## 配置入口

| 文件 | 用途 |
| --- | --- |
| `astro-paper.config.ts` | 网站地址、名称、简介、语言、主题与社交链接 |
| `src/content/pages/about.md` | 关于页内容 |
| `src/content/posts/` | 博客文章 |
| `.github/workflows/deploy.yml` | GitHub Pages 构建和部署流程 |

## 发布

在仓库 `Settings → Pages → Source` 中选择 **GitHub Actions**。推送到 `main` 后，工作流会执行项目构建、生成搜索索引并部署网站。

在仓库的 [Actions](https://github.com/bigStrongK/bigStrongK.github.io/actions) 中确认 `build` 和 `deploy` 都成功，再检查正式网址的页面和搜索。

本仓库使用 `bigStrongK.github.io` 作为仓库名，网站位于域名根路径。迁移到其他账号时，需要同步修改网站地址、GitHub 链接和文章编辑链接；使用普通项目仓库名时，还需按 [Astro 官方部署文档](https://docs.astro.build/en/guides/deploy/github/) 配置 `base`。

## 许可证

基于 AstroPaper 开发，保留原项目的 [MIT 许可证](LICENSE)。
