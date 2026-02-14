import React, { useState, useMemo, useRef } from 'react';
import { 
  Settings, RefreshCcw, Upload, Zap, Download, 
  Columns, CheckCircle2, FileSearch, X, Info, AlertTriangle, Eraser, PlusCircle, Copy, ExternalLink, ShieldCheck
} from 'lucide-react';
import { Paper, Journal, AnalysisResult, Segment, AIKeyConfig, AIProvider } from './types';
import { JOURNALS } from './constants';
import mammoth from 'mammoth';
import { analyzePaper } from './services/aiService';
import { exportToDocx } from './services/wordExporter';

// --- 段落渲染组件 ---
const SegmentRenderer: React.FC<{ segment: Segment }> = ({ segment }) => {
  const baseClass = "leading-relaxed mb-8 text-slate-800";

  const renderSafeContent = (content: any): React.ReactNode => {
    if (typeof content === 'string') return content;
    if (typeof content === 'number') return String(content);
    if (Array.isArray(content)) {
      return (
        <ul className="list-none space-y-2">
          {content.map((item, i) => (
            <li key={i}>{typeof item === 'object' ? Object.values(item).filter(Boolean).join('. ') : item}</li>
          ))}
        </ul>
      );
    }
    if (typeof content === 'object' && content !== null) {
      return Object.values(content).filter(Boolean).join('. ');
    }
    return "";
  };

  const safeContent = renderSafeContent(segment.content);

  switch (segment.type) {
    case 'title': 
      return <h1 className="text-4xl font-black text-slate-900 border-l-[12px] border-indigo-600 pl-8 mb-12 mt-4">{safeContent}</h1>;
    case 'author': 
      return <p className="text-xl font-bold text-slate-500 mb-10 tracking-tight">{safeContent}</p>;
    case 'abstract': 
      return (
        <div className="bg-slate-50 p-10 rounded-[2.5rem] border-2 border-slate-100 mb-10 shadow-inner">
          <span className="text-sm font-black text-indigo-600 uppercase tracking-[0.2em] block mb-4">摘要 (Abstract)</span>
          <p className="text-xl leading-loose italic text-slate-700">{safeContent}</p>
        </div>
      );
    case 'heading_l1': 
      return <h2 className="text-3xl font-black text-slate-900 mt-16 mb-8 flex items-center gap-4"><span className="w-2.5 h-10 bg-indigo-600 rounded-full" /> {safeContent}</h2>;
    case 'references':
      return (
        <div className="mt-20 pt-10 border-t-4 border-slate-900">
          <h3 className="text-2xl font-black mb-8 uppercase tracking-wider text-slate-900">参考文献</h3>
          <div className="text-lg leading-relaxed text-slate-600 space-y-4">
            {Array.isArray(segment.content) ? (
              segment.content.map((item, i) => <p key={i} className="pl-8 -indent-8">{typeof item === 'object' ? Object.values(item).filter(Boolean).join('. ') : item}</p>)
            ) : <p className="pl-8 -indent-8">{safeContent}</p>}
          </div>
        </div>
      );
    case 'table': 
      return (
        <div className="my-12 overflow-hidden rounded-[3rem] border-2 border-slate-200 shadow-xl bg-white">
          {segment.caption && <p className="bg-slate-50 px-8 py-5 text-base font-black text-slate-900 border-b-2 border-slate-200 text-center uppercase tracking-wide">{renderSafeContent(segment.caption)}</p>}
          <div className="p-10 overflow-x-auto">
            <table className="w-full text-base text-left border-collapse">
              <thead><tr className="border-t-[3px] border-b-2 border-slate-900">{segment.data?.[0]?.map((cell, i) => <th key={i} className="px-5 py-4 font-black">{renderSafeContent(cell)}</th>)}</tr></thead>
              <tbody>{segment.data?.slice(1).map((row, ri) => (
                <tr key={ri} className={ri === (segment.data?.length ?? 0) - 2 ? "border-b-[3px] border-slate-900" : "border-b border-slate-100"}>{row?.map((cell, ci) => <td key={ci} className="px-5 py-4 text-slate-600">{renderSafeContent(cell)}</td>)}</tr>
              ))}</tbody>
            </table>
          </div>
        </div>
      );
    case 'body': return <p className={`text-xl leading-[2.2] text-justify ${baseClass}`} dangerouslySetInnerHTML={{ __html: String(safeContent) }} />;
    default: return <p className={`text-xl ${baseClass}`}>{safeContent}</p>;
  }
};

const App: React.FC = () => {
  const [fullText, setFullText] = useState('');
  const [inputMode, setInputMode] = useState<'full' | 'snippet'>('full');
  const [selectedJournalId, setSelectedJournalId] = useState(JOURNALS[0].id);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const [configs, setConfigs] = useState<AIKeyConfig[]>([
    { provider: 'glm', modelName: 'glm-4-flash', apiKey: localStorage.getItem('KEY_GLM') || '', enabled: true, guide: 'https://open.bigmodel.cn/usercenter/apikeys' },
    { provider: 'deepseek', modelName: 'deepseek-chat', apiKey: localStorage.getItem('KEY_DS') || '', enabled: false, guide: 'https://platform.deepseek.com/api_keys' },
    { provider: 'gemini', modelName: 'gemini-1.5-flash', apiKey: localStorage.getItem('KEY_GEMINI') || '', enabled: false, guide: 'https://aistudio.google.com/app/apikey' }
  ]);

  const selectedJournal = useMemo(() => JOURNALS.find(j => j.id === selectedJournalId) || JOURNALS[0], [selectedJournalId]);

  const handleReset = () => {
    if (window.confirm("确定要清空并开始新篇章吗？")) {
      setFullText('');
      setResult(null);
      setError(null);
    }
  };

  const handleCopy = async () => {
    if (!result?.segments) return alert("尚未生成分析结果");
    const textToCopy = result.segments.map(seg => {
      if (seg.type === 'table' && seg.data) return `${seg.caption || ''}\n` + seg.data.map(r => r.join('\t')).join('\n');
      return typeof seg.content === 'object' ? JSON.stringify(seg.content) : seg.content;
    }).join('\n\n');
    await navigator.clipboard.writeText(textToCopy);
    alert("已复制到剪贴板！");
  };

  const runAnalysis = async () => {
    if (!configs.some(c => c.enabled && c.apiKey)) return setShowSettings(true);
    if (fullText.length < 20) return setError('内容过短');
    setIsAnalyzing(true); setError(null);
    try {
      const res = await analyzePaper({ fullText, mode: inputMode, configs }, selectedJournal);
      setResult(res);
    } catch (err: any) { setError(err.message); } finally { setIsAnalyzing(false); }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F1F5F9] font-sans selection:bg-indigo-100">
      {/* --- API 管理面板 --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-xl w-full shadow-2xl relative">
            <button onClick={() => setShowSettings(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-600"><X size={36} /></button>
            <h2 className="text-3xl font-black mb-4 text-slate-900">API 管理中心</h2>
            
            {/* 额度与隐私说明 */}
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-4 mb-8 rounded-r-xl">
              <p className="text-sm text-indigo-900 leading-relaxed font-bold">
                🛡️ <span className="underline">零成本、高隐私模式</span>：<br />
                本项目不存储您的 API Key，所有 Key 仅保存在您本机的浏览器缓存中。
                分析过程消耗的是您自备账号的免费额度，不会产生额外费用，请放心使用。
              </p>
            </div>

            <div className="space-y-6">
              {configs.map((cfg, idx) => (
                <div key={cfg.provider} className={`p-6 rounded-[2rem] border-2 ${cfg.enabled ? 'border-indigo-600 bg-indigo-50/30' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-black text-indigo-600 uppercase tracking-widest">{cfg.provider}</span>
                    <input type="checkbox" checked={cfg.enabled} onChange={(e) => {
                      const nc = [...configs]; nc[idx].enabled = e.target.checked; setConfigs(nc);
                    }} className="w-6 h-6 accent-indigo-600 cursor-pointer" />
                  </div>
                  <input type="password" value={cfg.apiKey} placeholder="粘贴 API Key" onChange={(e) => {
                    const nc = [...configs]; nc[idx].apiKey = e.target.value; setConfigs(nc);
                    localStorage.setItem(`KEY_${cfg.provider.toUpperCase()}`, e.target.value);
                  }} className="w-full bg-white border-none rounded-xl px-5 py-3 font-mono shadow-sm mb-2" />
                  <a href={cfg.guide} target="_blank" rel="noreferrer" className="text-xs text-slate-400 flex items-center gap-1 hover:text-indigo-600 transition-colors">
                    <ExternalLink size={12}/> 获取 {cfg.provider.toUpperCase()} API Key 指引
                  </a>
                </div>
              ))}
              <button onClick={() => setShowSettings(false)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-transform">确认并保存配置</button>
            </div>
          </div>
        </div>
      )}

      {/* --- 使用指南弹窗 --- */}
      {showGuide && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[3.5rem] p-12 max-w-2xl w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setShowGuide(false)} className="absolute top-10 right-10 text-slate-300 hover:text-slate-600"><X size={36} /></button>
            <h2 className="text-4xl font-black mb-10 text-slate-900">使用指南</h2>
            <div className="space-y-8 text-slate-700">
              <div>
                <h3 className="text-2xl font-black text-indigo-600 mb-4">📋 什么是 FinFormatter?</h3>
                <p className="text-lg leading-relaxed">FinFormatter 是一个智能金融论文排版架构师，能够帮助您快速分析和重构金融论文，支持多种学术期刊格式的自动适配。</p>
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-indigo-600 mb-4">🚀 快速开始</h3>
                <ol className="text-lg space-y-3 list-decimal list-inside font-medium">
                  <li><strong>配置 API</strong>：点击右上角"API 管理"，前往各模型官网注册获取免费 API Key。</li>
                  <li><strong>输入论文</strong>：在左侧输入框粘贴内容，或点击"载入 Word"上传。</li>
                  <li><strong>选择期刊</strong>：在下拉菜单中选择目标期刊格式。</li>
                  <li><strong>开始重构</strong>：点击按钮，AI 将在本地调用接口完成结构分析。</li>
                </ol>
              </div>

              <div>
                <h3 className="text-2xl font-black text-indigo-600 mb-4">🔑 获取 API Key 路径</h3>
                <div className="space-y-3 text-lg">
                  <p><strong>GLM (推荐)</strong>：前往 <a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">智谱 AI 平台</a> 获取。</p>
                  <p><strong>DeepSeek</strong>：前往 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">DeepSeek 开放平台</a> 获取。</p>
                  <p><strong>Gemini</strong>：前往 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">Google AI Studio</a> 获取。</p>
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2"><ShieldCheck className="text-emerald-600" /> 隐私承诺</h3>
                <p className="text-sm leading-relaxed text-slate-500">
                  您的数据仅在浏览器本地处理，绝不上传云端。所有 API 请求均为您的客户端与官方服务器直接通信。
                </p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="w-full mt-10 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl active:scale-95 transition-transform">返回</button>
          </div>
        </div>
      )}

      {/* --- Header --- */}
      <header className="bg-white/90 border-b-2 border-slate-200 px-12 py-8 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-5"><Columns size={40} className="text-indigo-600" /><h1 className="text-3xl font-black tracking-tighter text-slate-900">FinFormatter <span className="text-indigo-600">Pro</span></h1></div>
        <div className="flex items-center gap-6">
          <button onClick={() => setShowGuide(true)} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-black transition-colors"><Info size={20} /> 使用指南</button>
          <button onClick={handleReset} className="flex items-center gap-2 text-slate-400 hover:text-rose-600 font-black"><Eraser size={20} /> 清空</button>
          <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 px-8 py-4 bg-slate-100 rounded-full font-black text-slate-900 hover:bg-slate-900 hover:text-white transition-all shadow-sm"><Settings size={20} /> API 管理</button>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-10 max-w-[1700px] grid grid-cols-1 xl:grid-cols-12 gap-12">
        {/* 左侧输入 */}
        <div className="xl:col-span-7 bg-white rounded-[4rem] border-2 border-slate-200 shadow-2xl overflow-hidden flex flex-col">
          <div className="px-12 py-10 border-b-2 border-slate-100 flex items-center justify-between bg-slate-50/30">
            <div className="text-slate-900"><span className="text-sm font-black text-indigo-600 uppercase block mb-1">Step 02</span><h3 className="text-2xl font-black">论文草稿</h3></div>
            <select value={selectedJournalId} onChange={(e) => setSelectedJournalId(e.target.value)} className="bg-white border border-slate-200 rounded-full px-6 py-3 font-black text-slate-700 cursor-pointer shadow-sm">
              {JOURNALS.map(j => <option key={j.id} value={j.id}>{j.journal}</option>)}
            </select>
          </div>
          <div className="p-12 flex-1 flex flex-col min-h-[700px]">
            <textarea value={fullText} onChange={(e) => setFullText(e.target.value)} className="flex-1 w-full text-2xl font-serif outline-none resize-none text-slate-700" placeholder="在此粘贴您的论文内容..." />
            <div className="mt-8 flex justify-between items-center">
              <div className="flex flex-col gap-2">
                <button onClick={() => fileInputRef.current?.click()} className="text-indigo-600 font-black flex items-center gap-2 hover:translate-x-1 transition-transform"><Upload size={20}/> 载入 Word 文档</button>
                <div className="flex items-center gap-2 text-slate-400">
                   <ShieldCheck size={14} className="text-emerald-500" />
                   <span className="text-xs font-bold">全本地解析，保护学术安全</span>
                </div>
              </div>
              <button onClick={runAnalysis} disabled={isAnalyzing} className={`px-16 py-8 rounded-[2.5rem] font-black text-2xl uppercase flex items-center gap-6 shadow-2xl transition-all ${isAnalyzing ? 'bg-slate-100 text-slate-300' : 'bg-slate-900 text-white hover:bg-indigo-600 active:scale-95'}`}>
                {isAnalyzing ? <RefreshCcw className="animate-spin" size={32} /> : <Zap size={32} />} {isAnalyzing ? '分析中' : '开始重构'}
              </button>
            </div>
            <input type="file" ref={fileInputRef} onChange={async (e) => {
               const file = e.target.files?.[0];
               if (file) {
                 const res = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
                 setFullText(res.value);
               }
            }} className="hidden" />
          </div>
        </div>

        {/* 右侧预览 */}
        <div className="xl:col-span-5 relative">
          {result && !isAnalyzing ? (
            <div className="bg-white rounded-[3.5rem] border-2 border-slate-200 shadow-2xl flex flex-col h-full max-h-[1000px] overflow-hidden">
              <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md px-10 py-6 border-b border-slate-100 flex justify-end gap-4 shadow-sm">
                <button onClick={handleCopy} className="bg-indigo-600 text-white px-8 py-4 rounded-full font-black flex items-center gap-2 hover:scale-110 active:scale-95 transition-all"><Copy size={20}/> 复制结果</button>
                <button onClick={() => exportToDocx(result.segments, selectedJournal)} className="bg-emerald-600 text-white px-8 py-4 rounded-full font-black flex items-center gap-2 hover:scale-110 active:scale-95 transition-all"><Download size={20}/> 导出 Word</button>
              </div>
              
              <div className="p-14 overflow-y-auto flex-1 select-text scroll-smooth">
                {result.segments.map((seg, idx) => <SegmentRenderer key={idx} segment={seg} />)}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[800px] flex flex-col items-center justify-center text-center bg-white border-4 border-dashed border-slate-100 rounded-[5rem] opacity-50 px-10">
              <FileSearch size={120} className="text-slate-100 mb-6" strokeWidth={1} /><h3 className="text-slate-300 font-black text-2xl uppercase tracking-[0.4em]">等待重构指令</h3>
            </div>
          )}
        </div>
      </main>
      <footer className="bg-white border-t-2 border-slate-100 py-16 text-center">
         <p className="text-sm font-black text-slate-300 uppercase tracking-[0.6em]">Academic Integrity & Privacy First</p>
      </footer>
    </div>
  );
};

export default App;