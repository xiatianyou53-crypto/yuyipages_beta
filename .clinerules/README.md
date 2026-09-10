# .clinerules —— 代理设计规范（Taste Skill + Impeccable）

本目录存放从开源项目安装的 AI 代理设计指令，Cline 会自动读取并在设计/前端改动时遵循。

## 1) Taste Skill
- 来源：https://github.com/Leonxlnx/taste-skill
- 许可：MIT License · Copyright (c) 2026 Leonxlnx
- 文件：
  - `taste-skill.md` —— 通用"反 AI 味"高级前端设计规范（`design-taste-frontend`）
  - `redesign-skill.md` —— 改造已有项目界面的审计与升级规范（`redesign-existing-projects`）

## 2) Impeccable
- 来源：https://github.com/pbakaus/impeccable
- 许可：Apache License 2.0 · Created by Paul Bakaus
- 文件：`impeccable/`（`SKILL.src.md`、`reference/*.md`、`agents/*.md`）
- 它自带一个**确定性检测器**（无需 API key），可直接扫描本站：
  ```bash
  hugo --minify
  npx impeccable@latest detect public        # 扫描构建产物；exit 0 = 无主要问题
  npx impeccable@latest detect --json public # 机器可读输出
  ```
  检测项包括 AI 味（单边粗色边框、紫色渐变、弹跳缓动）、可读性（文字对比度、行宽、内边距）、
  结构（标题层级跳级）、触控目标尺寸等。
- 本项目在 2026-09 用该检测器做过一轮整改：问题数 98 → 15 → **0**。

> 说明：这些只是给 AI 代理读的指导性文本与工具，不参与网站构建，不影响 Hugo 输出。
> 如需更新，请重新从上游仓库拉取。

