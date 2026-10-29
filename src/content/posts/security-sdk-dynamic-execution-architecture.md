---
title: 安全 SDK 动态执行架构方案
description: 一种由稳定控制底座、可更新解释器和动态业务程序构成的分层设计，讨论执行契约、资源边界、版本切换与故障恢复。
pubDatetime: 2026-10-28T00:00:00+08:00
featured: true
draft: true
tags:
  - 安全 SDK
  - 架构设计
  - 动态执行
---
本文是一份 v0.1 架构设计草案，适用于允许独立工作进程的可联网桌面安全 SDK，供后续详细设计与验证使用。

本文确定架构方向、职责、执行契约及更新恢复原则。实施、构建、性能、兼容性、故障恢复及抗逆向验证均为 NOT RUN。具体资源数值与平台权限配置待详细设计确定。

## 目录

## 1 方案目标与总体决策

采用“稳定控制底座、可更新解释器、动态业务程序”的分层架构。宿主进程保留必要控制与采集能力，独立工作进程承载动态解释器、业务程序和适合移出的计算。解释器与程序按完整版本组合发布，每次执行绑定不可变组合。

架构同时考虑三个目标：

- 抗逆向：减少初始发布物直接暴露的业务逻辑，增加机制恢复和跨版本复用的成本。
- 性能：保留原生热点计算，以批量输入、有限解释调度和复用执行环境控制额外开销。
- 稳定性：将动态原生引擎的主要故障影响收敛到工作进程，并保留独立的版本选择、观测和恢复入口。

动态化不提供永久保密保证，也不天然减少总体包体或执行成本。解释器和业务程序进入本地后，仍可能被分析；版本变化带来的保护收益应在后续单独评估。

本文采用的初始设计选择：

| 决策项       | 方案选择                                   |
| ------------ | ------------------------------------------ |
| 部署方式     | 宿主进程与独立工作进程分离                 |
| 执行形式     | 受限字节码解释执行                         |
| 解释器更新   | 受控原生模块独立更新，保持明确的模块契约   |
| 业务程序更新 | 独立编译下发，与兼容引擎组成完整版本组合   |
| 首版扩展范围 | 不加入JIT、多层元解释器及独立动态语义包    |
| 业务程序职责 | 以计算、判定和证据生成为主                 |
| 跨任务状态   | 由稳定层或服务端显式提供，不由程序隐式维护 |
| 宿主关键路径 | 不依赖当次下载、更新或远程请求成功         |
| 对外故障语义 | 明确区分未发现异常、失败、不支持及结果未知 |

## 2 总体架构与职责

<figure aria-label="总体架构与职责" style="margin:2rem 0;max-width:100%;min-width:0"><div tabindex="0" role="region" aria-label="总体架构与职责，窄屏可横向滚动" style="width:100%;max-width:100%;min-width:0;overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px"><svg id="sdk-exec-architecture" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 736 944" width="736" height="944" role="img" aria-labelledby="sdk-exec-architecture-title sdk-exec-architecture-desc" style="display:block;width:100%;min-width:736px;height:auto"><title id="sdk-exec-architecture-title">安全 SDK 动态执行架构</title><desc id="sdk-exec-architecture-desc">服务端发布经授权的完整组合，宿主控制底座与独立工作进程交换版本组合、任务、受控调用和结果。</desc><defs><marker id="sdk-exec-architecture-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9 Z" fill="#52616b"/></marker></defs><rect x="0" y="0" width="736" height="944" fill="#fbfcfe"/><g data-zone-id="S"><rect x="40" y="40" width="656" height="160" rx="8" fill="#f3f6fa" stroke="#64748b" stroke-width="1" stroke-dasharray="5 4"/><text x="56" y="68" text-anchor="start" font-size="14" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">服务端</text></g><g data-zone-id="H"><rect x="40" y="248" width="656" height="176" rx="8" fill="#f3f6fa" stroke="#64748b" stroke-width="1" stroke-dasharray="5 4"/><text x="56" y="276" text-anchor="start" font-size="14" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">业务宿主进程</text></g><g data-zone-id="W"><rect x="40" y="496" width="656" height="344" rx="8" fill="#f3f6fa" stroke="#64748b" stroke-width="1" stroke-dasharray="5 4"/><text x="56" y="524" text-anchor="start" font-size="14" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">独立工作进程</text></g><path data-edge-id="e1" data-from="A" data-to="B" d="M232 132 H280" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e2" data-from="B" data-to="C" d="M456 132 H504" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e3" data-from="D" data-to="K" d="M232 340 H280" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e4" data-from="K" data-to="N" d="M456 340 H504" fill="none" stroke="#52616b" stroke-width="1.4" marker-start="url(#sdk-exec-architecture-arrow)" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e5" data-from="L" data-to="E" d="M336 624 V720" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e6" data-from="P" data-to="E" d="M232 756 H280" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e7" data-from="E" data-to="R" d="M456 756 H504" fill="none" stroke="#52616b" stroke-width="1.4" marker-start="url(#sdk-exec-architecture-arrow)" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e8" data-from="E" data-to="L" d="M400 720 V624" fill="none" stroke="#52616b" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e9" data-from="L" data-to="P" d="M280 576 H152 Q144 576 144 584 V720" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e10" data-from="C" data-to="K" d="M592 168 V216 Q592 224 584 224 H376 Q368 224 368 232 V304" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-exec-architecture-arrow)"/><path data-edge-id="e11" data-from="K" data-to="L" d="M368 376 V552" fill="none" stroke="#52616b" stroke-width="1.4" marker-start="url(#sdk-exec-architecture-arrow)" marker-end="url(#sdk-exec-architecture-arrow)"/><rect x="376" y="444" width="176" height="48" rx="2" fill="#fbfcfe"/><text x="464" y="462" text-anchor="middle" font-size="12" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">版本组合、任务、</text><text x="464" y="482" text-anchor="middle" font-size="12" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">受控调用与结果</text><g data-node-id="A"><rect x="56" y="96" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="144" y="127" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">解释器与业务程序</text><text x="144" y="145" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">源码</text></g><g data-node-id="B"><rect x="280" y="96" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="368" y="127" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">编译、测试与</text><text x="368" y="145" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">组合准备</text></g><g data-node-id="C"><rect x="504" y="96" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="592" y="127" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">发布授权、签名清单</text><text x="592" y="145" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">与内容仓库</text></g><g data-node-id="D"><rect x="56" y="304" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="144" y="344" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">SDK 公共接口</text></g><g data-node-id="K"><rect x="280" y="304" width="176" height="72" rx="6" fill="#e6f4f1" stroke="#0f766e" stroke-width="1.2"/><text x="368" y="344" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#0f766e">最小控制底座</text></g><g data-node-id="N"><rect x="504" y="304" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="592" y="335" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">必要的宿主采集</text><text x="592" y="353" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">与有界原生能力</text></g><g data-node-id="L"><rect x="280" y="552" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="368" y="583" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">稳定进程入口</text><text x="368" y="601" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">与 IPC 适配</text></g><g data-node-id="P"><rect x="56" y="720" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="144" y="760" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">动态业务程序</text></g><g data-node-id="E"><rect x="280" y="720" width="176" height="72" rx="6" fill="#e6f4f1" stroke="#0f766e" stroke-width="1.2"/><text x="368" y="760" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#0f766e">动态解释器</text></g><g data-node-id="R"><rect x="504" y="720" width="176" height="72" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="592" y="751" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">工作进程内</text><text x="592" y="769" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">原生计算</text></g><text x="40" y="904" text-anchor="start" font-size="12" font-weight="400" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">分组表示运行位置；箭头表示发布、调用或结果关联。</text></svg></div><figcaption style="font-size:0.875rem;margin-top:0.5rem">总体架构与职责；窄屏可在图内横向滚动。</figcaption></figure>

### 2.1 最小控制底座

底座负责SDK公共接口、更新信任锚和验证、完整组合校验、活动版本选择、任务调度、能力授权、进程外观测及恢复控制。

底座不承载频繁变化的业务判断。动态模块不能自行扩大能力、修改启用策略或替换信任根。底座及信任锚可以受控升级，但不能由新下发模块自行证明其更新可信。

“最小”以必要、稳定和易审查为原则，不以隐藏所有公开接口和验证逻辑为目标。客户端只保留必要验证材料，不嵌入服务端发布签名私钥或全局长期秘密。

### 2.2 稳定工作进程入口

工作进程入口负责建立通信、装载被授权的解释器、创建执行实例和转交结果。它与解释器使用版本化模块契约，并明确跨模块缓冲区、错误和生命周期归属。

宿主与工作进程之间只交换有界结构化数据或受控共享快照，不传裸指针。共享数据需要明确读写权限、所有权及有效期。

工作进程的权限、继承句柄、通信对象及资源限制由解释器之外的机制配置。具体操作系统限制方式待平台详细设计确定；独立进程本身不等于完整沙箱。

### 2.3 动态解释器

解释器负责程序格式与类型检查、控制流和调用检查、指令执行、任务上下文、程序资源计量及结构化结果生成。

原生解释器属于工作进程的可信执行基。字节码限制只能约束业务程序，不能约束原生解释器自身的内存访问、系统调用或缺陷行为。签名与摘要验证证明来源和内容绑定，不证明代码安全。

解释器更新用于修复缺陷、扩展表达能力或调整保护实现，不要求随每次业务程序更新更换。超出底座能力或模块契约的引擎升级，仍需配套更新底座。

### 2.4 动态业务程序

业务逻辑在服务端编译为受限字节码和必要常量。首版支持必要计算、分支及有界遍历，并限制内存、执行量、调用次数和输出规模，不开放任意文件、网络、原生库加载或任意地址访问能力。

程序使用显式输入快照，输出判断及证据。跨任务历史信息由稳定层或服务端提供，程序不得依赖隐藏的全局状态。

### 2.5 原生能力与服务端

原生能力按业务需要提供可组合操作，例如结构化信号读取、批量摘要、匹配和聚合。必须读取宿主内部状态的操作保留在宿主；可移出的重计算及潜在阻塞操作优先安排在可独立处置的执行环境。

服务端负责程序与引擎构建、组合管理、发布授权、签名、启用范围及效果观察。适合远程处理的私有数据和关联判断保留在服务端；客户端结果作为风险证据，不直接等同于可信事实。

## 3 三份核心契约

### 3.1 底座与工作进程通信契约

每个任务至少绑定任务标识、实例标识、完整组合标识、输入与配置快照、能力授权、执行预算和截止条件。

结果至少包含上述关联标识、执行状态、业务判断、证据引用、资源统计及错误信息。接收方必须校验消息大小、字段范围、任务归属和实例身份。字段和序列化格式在详细设计中确定。

异步请求与响应同样关联任务、实例和组合。旧实例的迟到结果不得交付给新实例，也不得覆盖已经结束任务的结果。

### 3.2 工作进程入口与解释器模块契约

契约覆盖能力与版本协商、实例创建、任务执行、协作取消、结果释放及实例销毁。明确内存由谁分配和释放、回调何时有效、任务结束后还有哪些资源可能存活。

协作取消用于正常执行流程，不作为停止错误原生引擎的保证。原生引擎失控时，由进程外监督逻辑按策略回收工作进程。

### 3.3 解释器与程序执行契约

程序声明所需指令版本、原生能力、输入输出格式和预算请求。实际能力与预算由底座授权上限和程序请求共同决定，程序不能通过声明获得额外权限。

原生能力接口逐项定义输入、输出、执行成本、阻塞特征和副作用。程序只能调用已授权接口；未声明或不支持的能力不默认开放。

## 4 性能设计

性能成本按宿主、工作进程、通信和更新四部分统计，不只比较初始安装包。

| 场景       | 设计选择                                         |
| ---------- | ------------------------------------------------ |
| 信号输入   | 优先批量快照，减少细碎IPC与重复采集              |
| 高频重计算 | 使用批量原生操作，避免逐元素解释与跨进程调用     |
| 程序准备   | 复用与内容摘要、引擎版本及执行配置匹配的解析结果 |
| 执行环境   | 复用工作进程，每次任务创建独立上下文             |
| 更新准备   | 后台下载、校验和候选实例准备                     |
| 结果输出   | 有界、结构化，按需要记录证据引用                 |
| 内存峰值   | 计入候选、活动及排空实例，缓存和临时缓冲区       |

原生接口过粗会把重点机制继续固化在本地；接口过细会增加解释调度和通信成本。采用面向业务的基础操作集合，后续按实际热点调整。

资源限制分两层：解释器约束程序执行量、内存和调用；进程外控制约束工作进程资源及生命周期。程序预算不能代替原生引擎边界；程序超时也不能自动中断阻塞的原生调用。

首版限制受支持的组合数量和并存实例，不引入无上限变体或版本并行。并发数、队列长度、启动、尾延迟、CPU、内存与下载预算均待定。

## 5 抗逆向设计

保护目标是提高分析及复现成本，并降低旧成果在后续版本上的复用收益。

| 对象       | 本地暴露边界                   | 保护取向                             |
| ---------- | ------------------------------ | ------------------------------------ |
| 控制底座   | 安装后即可研究                 | 保持简单、可审查，不依赖验证逻辑保密 |
| 动态解释器 | 装载后可被研究                 | 选择性保护关键执行路径，允许受控更新 |
| 业务程序   | 下发后其编码和执行行为可被观察 | 减少初始固化暴露，独立更新高价值判断 |
| 服务端资产 | 不随客户端完整分发             | 独立控制访问、身份与授权             |

不同版本可以调整程序组织或保护表示，但版本配对首先服务正确性。仅改变编码、编号或文件摘要，不直接证明分析难度提高。首版不为了制造差异而持续更换整个解释器。

交付加密可以减少传输和存储中的直接暴露，不能自动对具有本地分析权限的一方保密。标准密码、内存安全和恢复逻辑不因抗分析需求而故意复杂化。

后续保护效果应关注分析者已理解旧版后，理解新版及构建等效原型所需的新增工作；本轮不开展该项验证。

## 6 版本发布与切换

### 6.1 完整组合

签名发布清单绑定底座能力ABI、引擎内容摘要、程序内容摘要、必要资源和配置、输入输出格式、所需能力、资源要求及安全版本策略。

校验和装载必须绑定同一内容，避免验证后内容被替换。各文件签名有效仍不足以证明它们构成被授权的兼容组合。

### 6.2 更新生命周期

<figure aria-label="完整组合的更新与切换" style="margin:2rem 0;max-width:100%;min-width:0"><div tabindex="0" role="region" aria-label="完整组合的更新与切换，窄屏可横向滚动" style="width:100%;max-width:100%;min-width:0;overflow-x:auto;border:1px solid #e5e7eb;border-radius:8px"><svg id="sdk-update-lifecycle" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 736 880" width="736" height="880" role="img" aria-labelledby="sdk-update-lifecycle-title sdk-update-lifecycle-desc" style="display:block;width:100%;min-width:736px;height:auto"><title id="sdk-update-lifecycle-title">完整组合的更新生命周期</title><desc id="sdk-update-lifecycle-desc">候选下载后通过完整组合与兼容校验、候选实例准备、按策略启用、新任务切换及旧实例排空；校验或准备失败进入拒绝或隔离。</desc><defs><marker id="sdk-update-lifecycle-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9 Z" fill="#52616b"/></marker></defs><rect x="0" y="0" width="736" height="880" fill="#fbfcfe"/><path data-edge-id="e1" data-from="A" data-to="B" d="M272 120 V184" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-update-lifecycle-arrow)"/><path data-edge-id="e2" data-from="B" data-to="C" d="M272 248 V312" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-update-lifecycle-arrow)"/><path data-edge-id="e3" data-from="C" data-to="D" d="M272 376 V440" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-update-lifecycle-arrow)"/><path data-edge-id="e4" data-from="D" data-to="E" d="M272 504 V568" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-update-lifecycle-arrow)"/><path data-edge-id="e5" data-from="E" data-to="F" d="M272 632 V696" fill="none" stroke="#52616b" stroke-width="1.4" marker-end="url(#sdk-update-lifecycle-arrow)"/><path data-edge-id="e6" data-from="B" data-to="Q" d="M448 216 H584 Q592 216 592 224 V312" fill="none" stroke="#52616b" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#sdk-update-lifecycle-arrow)"/><path data-edge-id="e7" data-from="C" data-to="Q" d="M448 344 H504" fill="none" stroke="#52616b" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#sdk-update-lifecycle-arrow)"/><rect x="280" y="264" width="56" height="28" rx="2" fill="#fbfcfe"/><text x="308" y="282" text-anchor="middle" font-size="12" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">通过</text><rect x="280" y="392" width="80" height="28" rx="2" fill="#fbfcfe"/><text x="320" y="410" text-anchor="middle" font-size="12" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">准备成功</text><rect x="600" y="264" width="56" height="28" rx="2" fill="#fbfcfe"/><text x="628" y="282" text-anchor="middle" font-size="12" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">失败</text><rect x="456" y="308" width="40" height="28" rx="2" fill="#fbfcfe"/><text x="476" y="326" text-anchor="middle" font-size="12" font-weight="500" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">失败</text><g data-node-id="A"><rect x="96" y="56" width="352" height="64" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="272" y="92" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">候选下载</text></g><g data-node-id="B"><rect x="96" y="184" width="352" height="64" rx="6" fill="#e6f4f1" stroke="#0f766e" stroke-width="1.2"/><text x="272" y="220" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#0f766e">来源、完整组合与兼容校验</text></g><g data-node-id="C"><rect x="96" y="312" width="352" height="64" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="272" y="348" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">候选实例准备</text></g><g data-node-id="D"><rect x="96" y="440" width="352" height="64" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="272" y="476" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">按发布策略启用</text></g><g data-node-id="E"><rect x="96" y="568" width="352" height="64" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="272" y="604" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">新任务选择新组合</text></g><g data-node-id="F"><rect x="96" y="696" width="352" height="64" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="272" y="732" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">旧实例排空与回收</text></g><g data-node-id="Q"><rect x="504" y="312" width="176" height="64" rx="6" fill="#fbfcfe" stroke="#64748b" stroke-width="1.2"/><text x="592" y="348" text-anchor="middle" font-size="12" font-weight="600" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#1f2937">拒绝或隔离</text></g><text x="40" y="840" text-anchor="start" font-size="12" font-weight="400" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', 'PingFang SC', sans-serif" fill="#4b5563">实线表示正常推进；虚线表示校验或准备失败后的拒绝路径。</text></svg></div><figcaption style="font-size:0.875rem;margin-top:0.5rem">完整组合的更新与切换；窄屏可在图内横向滚动。</figcaption></figure>

候选内容与活动内容分开保存。当前活动组合在候选准备期间继续提供服务。候选准备和小范围启用的具体条件在详细设计中确定，不把“加载成功”作为全部通过依据。

活动组合切换只改变新任务的选择。已开始任务继续使用原实例及快照，或按定义结束。不得在任务中途更换解释器、程序或指令语义。

### 6.3 排空与并发状态

旧实例停止接收新任务后，等待其任务和异步调用结束。排空设定期限，到期按策略回收。确认工作进程退出只证明本地实例结束，不证明外部调用未发生。

切换和恢复需记录足以重建活动组合的状态。进程异常或系统重启后，不得把部分写入或不完整组合当成活动版本。

## 7 故障恢复与离线运行

### 7.1 故障与结果语义

首版动态程序主要产生计算、判定和证据。有业务副作用的动作，由底座或服务端受控执行，并逐项定义幂等、查询和必要的补偿语义。

结果状态至少区分：完成且发现异常、完成且未发现异常、执行失败、超时、资源超限、不支持、结果未知。已有SDK错误码如何映射，留待接口详细设计，不在本方案中新增具体错误码。

取消请求、调用超时或工作进程终止，不等于外部动作未执行。无法确认实际效果时记录为结果未知，不直接自动重复执行有副作用的动作。

### 7.2 观测与恢复控制

底座从进程外观察存活、任务时限、资源、通信积压和结果有效性，并保留必要的宿主指标。日志关联任务及组合，限制数量、大小和敏感信息暴露。

异常时先停止向问题组合分配新任务，再确认旧实例状态，按隔离能力回收实例，最后选择仍被允许的恢复组合。独立进程用于收敛故障影响，不保证消除系统级资源压力或操作系统故障。

### 7.3 可信回退与断网

回退只选择完整绑定、兼容且当前仍被授权的组合。历史运行成功、签名有效或存在缓存，均不足以证明当前仍允许使用。

正常版本推进与应急回退分开表达。应急回退可由新的授权发布决定指向允许的旧内容，同时维持安全版本下限及撤销约束。

断网时可继续使用符合本地可信策略的缓存组合。离线无法保证获得最新撤销信息，因此离线有效期、可信时间来源、允许回退集合和无可用组合时的行为必须明确。

没有可用组合时，保留约定的稳定基础能力并返回降级或不可用状态。业务是否继续、限制或等待，由事先确定的策略处理，程序不能自行放宽。

## 8 一项能力的执行示例

以模块完整性异常检测为例：

1. 底座选择被授权的完整组合，获取必要宿主快照并创建任务。
2. 工作进程入口装载对应解释器，建立独立任务上下文。
3. 程序选择检查对象，调用被授权的批量计算，组合结果并生成异常证据。
4. 解释器返回关联任务、实例及组合的结构化结果。
5. 底座检查结果契约，按既定策略交付宿主或服务端。
6. 程序更新时，新任务切换到新组合，已开始任务保持原绑定。
7. 解释器异常时，底座停止分配任务并处置工作进程；未完成任务不产生“未发现异常”结论。

这条路径保留原生计算效率，让变化快的判断独立更新，并使引擎故障具备独立处置入口。具体效果由后续实现与验证确认。

## 9 待细化事项

以下事项属于详细设计和产品参数，不改变本版分层及部署方向。

| 事项           | 需要确定的内容                                      |
| -------------- | --------------------------------------------------- |
| 平台与宿主范围 | 支持系统、架构、权限、分发方式及辅助进程约束        |
| 引擎选型       | 现成引擎或自研受限引擎、依赖与维护策略              |
| 程序格式       | 指令集合、类型、跳转与遍历限制、输入输出格式        |
| 原生能力       | 接口清单、参数边界、阻塞特征及副作用                |
| 操作系统限制   | 进程身份、句柄、文件与网络权限、IPC身份核对         |
| 性能与资源     | 包体、启动、尾延迟、CPU、内存、下载、队列及并发上限 |
| 执行生命周期   | 超时、排空期限、停止确认、迟到结果及重启处置        |
| 离线与回退     | 可信时间、有效期、最低安全版本、撤销与回退授权      |
| 产品故障策略   | 每类不可用、失败和未知状态对应的业务行为            |

后续详细设计顺序为：底座与工作进程通信契约、解释器模块契约、程序执行契约，再补齐平台权限、资源参数与发布恢复细节。AI可以辅助方案研究和程序生产，发布授权、签名和客户端能力边界不由生成内容自行决定。

## 10 设计参考

以下资料用于解释设计原则，不代表本方案已获得相同实现能力。

- [TUF更新安全设计](https://theupdateframework.io/docs/security/)：更新真实性、文件组合、版本新鲜度及密钥风险。
- [Microsoft Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)：Windows进程组管理、资源及生命周期控制。
- [Wasmtime执行限制](https://docs.wasmtime.dev/api/wasmtime/struct.Config.html)：程序执行计量、中断及阻塞宿主调用的边界。
- [Wasmtime安全模型](https://docs.wasmtime.dev/security.html)：来宾程序隔离与显式导入能力的设计参考。
