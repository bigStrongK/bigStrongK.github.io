---
title: "用 Codex 和 GitHub Pages 上线个人博客"
description: "从可复制的 Codex 提示词，到本地检查、公开发布和 Markdown 写作，记录这个博客的搭建过程。"
pubDatetime: 2026-10-14T00:00:00+08:00
featured: true
draft: false
tags:
  - Codex
  - Astro
  - GitHub Pages
---

这个博客由 Codex 协助搭建，方案是 **[AstroPaper](https://github.com/satnaing/astro-paper) + GitHub Pages**：用 Markdown 写文章，通过 GitHub Actions 自动构建和发布。

下面是整理后可以复用的操作流程。

## 1. 准备账号和工作目录

准备 GitHub 账号，在 Codex 中打开一个本地工作目录。首次使用可参考 [OpenAI 官方快速入门](https://learn.chatgpt.com/docs/quickstart)。

让 Codex 先检查 Git、Node.js 和 pnpm，版本按模板要求选择。本次使用 Node.js 24；pnpm 版本记录在项目的 `packageManager` 字段中。需要 GitHub 登录或仓库授权时，由自己完成。

## 2. 给 Codex 一个具体任务

把 `YOUR_USERNAME` 换成你的 GitHub 用户名，再调整标题和简介：

```text
请用 AstroPaper + GitHub Pages 搭建中文技术博客。
GitHub 用户名：YOUR_USERNAME
仓库：YOUR_USERNAME.github.io
标题：我的技术博客
简介：记录编程实践、问题排查与学习心得

保留文章、标签、关于页、中文搜索、RSS、深浅主题和手机适配。
确认模板来源，移除示例文章，保留许可证。
检查所需环境，安装依赖前先让我确认。
网站地址设为 https://YOUR_USERNAME.github.io/。
配置推送 main 后自动构建和部署的 GitHub Actions。
先完成本地预览和构建检查。
创建公开仓库、提交、推送和部署前，让我确认将公开的内容。
已有同名仓库时，先核对当前内容与发布设置。
```

## 3. 先检查本地效果

依赖安装完成后，在项目目录执行构建和预览，pnpm 使用项目指定的版本：

```sh
pnpm run build
pnpm run preview
```

打开终端显示的预览地址，检查首页、文章、关于页、中文搜索、主题切换和手机菜单。搜索索引在构建阶段生成，测试搜索前先完成构建。

这次在 Windows 上，我还让 Codex 把 `cp -r` 复制脚本改成了 Node.js 实现，方便跨平台构建。

## 4. 确认内容，再公开发布

确认源码和文章都可以公开后，明确授权：

```text
批准创建 YOUR_USERNAME/YOUR_USERNAME.github.io 公开仓库，
把当前初版提交并推送到 main，部署 GitHub Pages。
```

发布时核对以下三项，配置步骤可参考 [Astro 官方部署文档](https://docs.astro.build/en/guides/deploy/github/)：

1. 仓库的 `Settings → Pages → Source` 选择 **GitHub Actions**。
2. 仓库的 `Actions` 中，构建和部署都显示成功。
3. 打开 `https://YOUR_USERNAME.github.io/`，确认首页、文章和搜索可用。

使用 `YOUR_USERNAME.github.io` 这种仓库名称，网站位于域名根路径，Astro 无需增加仓库名作为 `base`。

## 5. 后续怎样写文章

在 `src/content/posts/` 新增 `.md` 文件，复制已有文章开头的 frontmatter，修改 `title`、`description`、`pubDatetime`、`tags` 和正文。

也可以直接告诉 Codex：

```text
按现有文章格式新增一篇技术笔记。
主题：……
我的实际操作和结果：……
写得简洁，保留读者能复现的步骤；缺少事实时先问我。
先预览，确认后再发布。
```

提交并推送到 `main` 后，GitHub Actions 会自动更新网站。
