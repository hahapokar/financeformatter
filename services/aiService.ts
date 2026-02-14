import { Paper, Journal, AnalysisResult, AIKeyConfig } from "../types";
import { SYSTEM_INSTRUCTION } from "../constants";

// 处理单个 API 请求的具体实现
const fetchAI = async (config: AIKeyConfig, prompt: string): Promise<AnalysisResult> => {
  let rawContent = "";
  
  // 1. 发起请求并获取原始文本内容
  if (config.provider === 'deepseek' || config.provider === 'glm') {
    const baseURL = config.provider === 'deepseek' 
      ? 'https://api.deepseek.com/v1/chat/completions' 
      : 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

    const response = await fetch(baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey.trim()}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [
          { role: "system", content: SYSTEM_INSTRUCTION },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = await response.json();
    rawContent = data.choices[0].message.content;
  } else if (config.provider === 'gemini') {
    const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/${config.modelName}:generateContent?key=${config.apiKey.trim()}`;
    
    const response = await fetch(geminiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nTask:\n${prompt}` }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });

    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const data = await response.json();
    rawContent = data.candidates[0].content.parts[0].text;
  } else {
    throw new Error("Unsupported Provider");
  }

  // 2. 关键点：净化 AI 返回的文本
  // 去除可能存在的 Markdown 代码块标记（如 ```json ... ```）
  let sanitized = rawContent
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // 3. 尝试解析 JSON 并校验结构
  try {
    const parsed = JSON.parse(sanitized);
    // 确保返回的数据中包含 segments 数组且长度大于 0
    if (!parsed || !Array.isArray(parsed.segments)) {
      throw new Error("AI 返回数据格式不完整（缺少 segments）");
    }
    return parsed;
  } catch (err) {
    console.error("JSON 解析失败，原始文本为:", rawContent);
    throw new Error("AI 返回内容解析失败");
  }
};

export const analyzePaper = async (paper: Paper, journal: Journal): Promise<AnalysisResult> => {
  const activeConfigs = (paper.configs ?? []).filter(c => c.enabled && c.apiKey);

  if (activeConfigs.length === 0) {
    throw new Error("请在设置中配置并开启至少一个有效的 API Key");
  }

  const prompt = `Target Journal: ${journal.journal}\nRules: ${JSON.stringify(journal.rules)}\nContent: ${paper.fullText}`;

  for (const config of activeConfigs) {
    try {
      console.log(`正在通过 ${config.provider} 进行重构分析...`);
      return await fetchAI(config, prompt);
    } catch (err: any) {
      console.warn(`${config.provider} 分析失败: ${err.message}，尝试 Fallback...`);
      // 如果是解析错误或 429，继续尝试下一个配置
      continue;
    }
  }

  throw new Error("所有启用的 AI 引擎均无法返回有效数据，请检查 Key 或尝试切换模型");
};