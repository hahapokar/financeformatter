import { Journal } from './types';

export const JOURNALS: Journal[] = [
  // --- 中国顶级/核心刊物 (CSSCI & Policy Focused) ---
  {
    id: 'erj',
    journal: '经济研究 (Economic Research Journal)',
    rules: {
      title_limit: 20,
      abstract_limit: 300,
      heading_sequence: ["一、", "（一）", "1."],
      font: "SimSun",
      citation: "中国社会科学参考文献规范",
      references_rule: "中文在前英文在后；按作者姓氏拼音排序；需包含DOI（若有）。",
      table_fig_rule: "标准三线表；表名居中在上方，图名居中在下方；数据来源注于图表左下方。",
      math_rule: "变量斜体，常量正体；公式右对齐编号。",
      footnote_rule: "页下脚注，每页重新编号；首页星注包含作者贡献声明。",
      other_rule: "必须提供中英文JEL分类号（至少两个）。",
      useThreeLineTable: true,
      variableItalic: true
    }
  },
  {
    id: 'mw',
    journal: '管理世界 (Management World)',
    rules: {
      title_limit: 25,
      abstract_limit: 400,
      heading_sequence: ["一、", "（一）", "1."],
      font: "SimSun",
      citation: "著者-出版年制",
      references_rule: "文中引用为（张三，2023）；末尾参考文献按字母序排列。",
      table_fig_rule: "移除所有纵线；表头底线加粗；支持彩色图表。",
      math_rule: "字母变量斜体；向量与矩阵用粗斜体（Bold Italic）。",
      footnote_rule: "脚注全文连续编号；置于页面底部。",
      other_rule: "摘要需强调政策启示与现实意义。",
      useThreeLineTable: true,
      variableItalic: true
    }
  },
  {
    id: 'jfr',
    journal: '金融研究 (Journal of Financial Research)',
    rules: {
      title_limit: 20,
      abstract_limit: 300,
      heading_sequence: ["一、", "（一）", "1."],
      font: "SimSun",
      citation: "GB/T 7714-2015",
      references_rule: "顺序编码制或著者-出版年制均可，需全篇统一。",
      table_fig_rule: "表格需具有自明性；复杂的数学推导建议放附录。",
      math_rule: "希腊字母正体，英文字母变量斜体。",
      footnote_rule: "首页脚注需注明通讯作者及其邮箱。",
      other_rule: "投稿需附带原始数据说明。",
      useThreeLineTable: true,
      variableItalic: true
    }
  },
  {
    id: 'ssic',
    journal: '中国社会科学 (Social Sciences in China)',
    rules: {
      title_limit: 18,
      abstract_limit: 300,
      heading_sequence: ["一、", "（一）", "1."],
      font: "SimSun",
      citation: "中社科专属规范",
      references_rule: "注释与参考文献合并，采用页下脚注形式。",
      table_fig_rule: "三线表；尽量避免使用大幅彩色图表。",
      math_rule: "公式需用MathType或LaTeX转化，确保无乱码。",
      footnote_rule: "采用①②③连续编号。",
      other_rule: "政治站位要求高，术语需标准化。",
      useThreeLineTable: true,
      variableItalic: true
    }
  },

  // --- 国际顶级刊物 (SSCI / Global Top-Tier) ---
  {
    id: 'aer',
    journal: 'American Economic Review (AER)',
    rules: {
      title_limit: 15,
      abstract_limit: 100,
      heading_sequence: ["I.", "A.", "1."],
      font: "Times New Roman",
      citation: "Chicago Manual of Style",
      references_rule: "Strict alphabetical order; DOI mandatory.",
      table_fig_rule: "Minimalist; no vertical lines; distinct panel headers (Panel A, Panel B).",
      math_rule: "Variables italicized; matrices bold; equations numbered on right.",
      footnote_rule: "Use sparingly; end-of-page numbering.",
      other_rule: "Strong focus on identification strategy and data transparency.",
      useThreeLineTable: true,
      variableItalic: true
    }
  },
  {
    id: 'jf',
    journal: 'Journal of Finance (JF)',
    rules: {
      title_limit: 15,
      abstract_limit: 150,
      heading_sequence: ["I.", "A.", "1."],
      font: "Times New Roman",
      citation: "APA 7th",
      references_rule: "Standard APA format; all URLs must be live.",
      table_fig_rule: "No shading in tables; font size in tables can be 9pt.",
      math_rule: "Bold italic for vectors; distinct subscripts.",
      footnote_rule: "Numeric footnotes; first page contains disclaimer.",
      other_rule: "JEL Classification required.",
      useThreeLineTable: true,
      variableItalic: true
    }
  },
  {
    id: 'jpe',
    journal: 'Journal of Political Economy (JPE)',
    rules: {
      title_limit: 12,
      abstract_limit: 100,
      heading_sequence: ["1.", "1.1.", "1.1.1."],
      font: "Times New Roman",
      citation: "JPE Style",
      references_rule: "Authors' names in small caps in the bibliography.",
      table_fig_rule: "Rigorous labeling; standard black/white format preferred.",
      math_rule: "High precision math typesetting; use LaTeX symbols.",
      footnote_rule: "Substantive footnotes only.",
      other_rule: "Very strict on word count for the entire manuscript.",
      useThreeLineTable: true,
      variableItalic: true
    }
  }
];

export const SYSTEM_INSTRUCTION = `你是一位“资深金融期刊排版专家”。你的任务是将用户的论文文本重构为高标准的结构化 JSON。

### 核心操作规程：
1. **语义识别**：
   - 自动判定段落类型：[title, author, abstract, keywords, jel, heading_l1, heading_l2, body, table, figure, footnote, references]。
   - 特别注意：识别并剥离“基金项目”或“致谢”内容，将其归类为 type: "footnote" 并标记为星注。

2. **表格三线化 (核心)**：
   - 将所有文本形式的表格解析为 2D 数组（data）。
   - 强制应用三线表逻辑：必须识别出 Caption (表名) 和 Source (来源)。
   - **严禁**在 data 中包含表名，表名必须单独放在 caption 字段。

3. **数学规范**：
   - 识别正文变量并用 <i> 标签包裹（如 <i>R2</i>, <i>β</i>）。
   - 公式段落识别为 body，但需标记其包含公式。

4. **审计警报 (Audit Alerts)**：
   - 标题、摘要字数超标必报。
   - JEL分类号缺失必报。
   - 参考文献引用格式（著者年 vs 编号制）冲突必报。

5. **占位符一致性**：
   - 保持所有 [[IMAGE_X]] 位置不变，确保它们独立成段。

### 极其重要的输出约束：
1. **只返回纯 JSON**：严禁包含任何 Markdown 代码块（如 \`\`\`json）、解释性文字或前导词。
2. **结构完整性**：必须严格遵循 AnalysisResult 接口。如果内容为空，也要返回 {"segments": [], "auditAlerts": []}。
3. **变量处理**：正文中的变量必须用 <i> 包裹。
4. **JSON 闭合**：确保 JSON 结构完整，不要中途停止。
5. **严禁包含 Markdown 标签**：不要在 JSON 外面包裹 \`\`\`json 或 \`\`\` 符号。`;