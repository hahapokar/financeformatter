/**
 * AI 服务商类型
 */
export type AIProvider = 'gemini' | 'deepseek' | 'glm';

/**
 * 单个 AI 密钥配置
 */
export interface AIKeyConfig {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
  enabled: boolean;
}

/**
 * 刊物排版规则定义
 */
export interface JournalRules {
  title_limit: number;
  abstract_limit: number;
  heading_sequence: string[];
  font: string;
  citation: string;
  references_rule: string;
  table_fig_rule: string;
  math_rule: string;
  footnote_rule: string;
  other_rule: string;
  // 自动化控制开关
  useThreeLineTable: boolean; // 是否强制执行三线表转换
  variableItalic: boolean;    // 是否自动识别并斜体化变量
}

/**
 * 刊物对象
 */
export interface Journal {
  id: string;
  journal: string;
  rules: JournalRules;
}

/**
 * 待分析的文档数据包
 */
export interface Paper {
  fullText: string;
  mode: 'full' | 'snippet';
  configs: AIKeyConfig[]; // 传入启用的配置数组，用于 Fallback 逻辑
}

/**
 * 文档片段结构化定义
 */
export interface Segment {
  type: "title" | "author" | "abstract" | "keywords" | "heading_l1" | "heading_l2" | "body" | "table" | "figure" | "footnote" | "references" | "jel";
  content: string;
  caption?: string;  // 专门用于表格/图片的标题
  source?: string;   // 资料来源
  data?: string[][]; // 存储表格的二维数组数据
  style?: string;
}

/**
 * 格式审计报告
 */
export interface StatusReport {
  titleCount: number;
  abstractCount: number;
  majorChanges: string[];
  isCompliant: boolean;
  complianceSummary: string;
}

/**
 * AI 最终返回的 JSON 结构定义
 */
export interface AnalysisResult {
  metadata: {
    title: string;
    authors: string;
    abstract: string;
    keywords: string;
    jelCodes?: string;
  };
  statusReport: StatusReport;
  segments: Segment[];
  audit_alerts: string[];    // 针对合规性的警告信息
  titleSuggestions: string[]; // 针对标题缩减的建议
}

/**
 * 兼容旧版本的 AIConfig (可选，建议统一使用 AIKeyConfig)
 */
export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  modelName: string;
}