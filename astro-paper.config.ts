import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://bigstrongk.github.io/",
    title: "bigStrongK 的技术博客",
    description: "记录编程实践、问题排查与学习心得",
    author: "bigStrongK",
    profile: "https://github.com/bigStrongK",
    ogImage: "social-card.png",
    lang: "zh-CN",
    timezone: "Asia/Shanghai",
    dir: "ltr",
  },
  posts: {
    perPage: 8,
    perIndex: 5,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: false,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: true,
      url: "https://github.com/bigStrongK/bigStrongK.github.io/edit/main/",
    },
    search: "pagefind",
  },
  socials: [
    {
      name: "github",
      url: "https://github.com/bigStrongK",
      linkTitle: "GitHub · bigStrongK",
    },
  ],
  shareLinks: [],
});
