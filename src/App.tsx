import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, BarChart3, TrendingUp, TrendingDown, Minus, AlertTriangle, Sparkles, ArrowRight, X, Loader2, ChevronDown, Shield, Zap, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './App.css';

type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'done' | 'error';
interface AnalysisResult { bias: 'bullish'|'bearish'|'neutral'; confidence: number; summary: string; analysis: string; keyLevels: { support: string[]; resistance: string[] }; patterns: string[]; recommendation: string; }

const analyzeChart = async (imageBase64: string, mimeType: string, context: string): Promise<AnalysisResult> => {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  if (!apiKey) throw new Error('OpenAI API key not configured. Add VITE_OPENAI_API_KEY to your .env file.');
  const systemPrompt = `You are an expert technical analyst specializing in Smart Money Concepts (SMC), price action, and institutional order flow analysis. Analyze the provided chart image and return a JSON response with this exact structure: {"bias":"bullish"|"bearish"|"neutral","confidence":<0-100>,"summary":"<1-2 sentences>","analysis":"<detailed markdown>","keyLevels":{"support":["<level>"],"resistance":["<level>"]},"patterns":["<pattern>"],"recommendation":"<actionable advice>"}`;
  const userMsg = context ? `Analyze this chart. Context: ${context}` : 'Analyze this trading chart in detail.';
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'gpt-4o', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: [{ type: 'text', text: userMsg }, { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: 'high' } }] }], max_tokens: 4096, temperature: 0.3 }),
  });
  if (!response.ok) { const err = await response.json().catch(() => ({})); throw new Error(err.error?.message || `API error: ${response.status}`); }
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  try { const m = content.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); } catch {}
  return { bias: 'neutral', confidence: 50, summary: 'Analysis completed.', analysis: content, keyLevels: { support: [], resistance: [] }, patterns: [], recommendation: 'Review the detailed analysis above.' };
};

const steps = ['Detecting market structure...','Identifying order blocks...','Analyzing fair value gaps...','Reading liquidity levels...','Evaluating trend strength...','Generating trade insights...'];

function App() {
  const [image, setImage] = useState<{ base64: string; url: string; mimeType: string } | null>(null);
  const [context, setContext] = useState('');
  const [state, setState] = useState<AnalysisState>('idle');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState(0);
  const [showDisclaimer, setShowDisclaimer] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const analyzeRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (state !== 'analyzing') return; const i = setInterval(() => setStep(p => (p + 1) % steps.length), 2000); return () => clearInterval(i); }, [state]);

  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    if (file.size > 20 * 1024 * 1024) { setError('File too large. Max 20MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { const d = reader.result as string; setImage({ base64: d.split(',')[1], url: d, mimeType: file.type }); setError(null); setState('idle'); };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) processFile(f); }, [processFile]);

  const handleAnalyze = async () => {
    if (!image) return;
    setState('analyzing'); setError(null); setStep(0);
    try { const r = await analyzeChart(image.base64, image.mimeType, context); setResult(r); setState('done'); }
    catch (e: any) { setError(e.message || 'Analysis failed.'); setState('error'); }
  };

  const handleReset = () => { setImage(null); setResult(null); setError(null); setState('idle'); setContext(''); };
  const scrollTo = () => analyzeRef.current?.scrollIntoView({ behavior: 'smooth' });

  const bc: Record<string, any> = {
    bullish: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', icon: TrendingUp, label: 'Bullish' },
    bearish: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', icon: TrendingDown, label: 'Bearish' },
    neutral: { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)', icon: Minus, label: 'Neutral' },
  };

  return (
    <div className="app">
      <AnimatePresence>
        {showDisclaimer && (
          <motion.div className="disclaimer-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="disclaimer-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}>
              <div className="disclaimer-icon"><AlertTriangle size={32} /></div>
              <h2>Important Disclaimer</h2>
              <p>This tool provides <strong>educational analysis only</strong>. Not financial advice. Trading involves significant risk.</p>
              <button className="btn-primary" onClick={() => setShowDisclaimer(false)}>I Understand <ArrowRight size={16} /></button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="navbar">
        <div className="nav-content">
          <div className="logo"><div className="logo-icon"><BarChart3 size={20} /></div><span className="logo-text">WIZU</span></div>
          <div className="nav-links"><a href="#features">Features</a><a href="#analyze" onClick={scrollTo}>Analyze</a></div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg" />
        <motion.div className="hero-content" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
          <motion.div className="hero-badge" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Sparkles size={14} /> AI-Powered Chart Analysis
          </motion.div>
          <h1 className="hero-title">Master the Markets<br />with <span className="gradient-text">Smart Money</span></h1>
          <p className="hero-subtitle">Upload any trading chart and get instant, institutional-grade analysis powered by AI. Identify order blocks, fair value gaps, and high-probability setups in seconds.</p>
          <div className="hero-actions"><button className="btn-primary btn-lg" onClick={scrollTo}><BarChart3 size={18} /> Analyze a Chart <ArrowRight size={18} /></button></div>
        </motion.div>
        <motion.div className="hero-visual" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }}>
          <div className="chart-mockup">
            <div className="mockup-header"><div className="mockup-dots"><span /><span /><span /></div><span className="mockup-title">EUR/USD · 4H</span></div>
            <div className="mockup-body"><div className="candle-row">{[40,55,35,60,50,70,45,65,55,75,60,80,50,70,85,65,90,75,95,80].map((h, i) => (<div key={i} className={`candle ${i > 12 ? 'green' : i > 8 ? 'red' : i % 3 === 0 ? 'green' : 'red'}`} style={{ height: `${h}%` }} />))}</div></div>
          </div>
        </motion.div>
      </section>

      <section id="features" className="features">
        <div className="section-content">
          <h2 className="section-title">Why Traders Choose WIZU</h2>
          <div className="features-grid">
            {[{ icon: Eye, title: 'Smart Money Analysis', desc: 'Detects institutional order blocks, fair value gaps, and liquidity levels automatically.' },{ icon: Zap, title: 'Instant Results', desc: 'Get detailed analysis in seconds. No more hours of manual chart reading.' },{ icon: Shield, title: 'High Accuracy', desc: 'Powered by GPT-4 Vision with specialized trading prompts for precise analysis.' }].map((f, i) => (
              <motion.div key={i} className="feature-card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}>
                <div className="feature-icon"><f.icon size={24} /></div><h3>{f.title}</h3><p>{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="analyze" ref={analyzeRef} className="analyzer-section">
        <div className="section-content">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="section-title">Chart Analyzer</h2>
            <p className="section-subtitle">Upload a chart screenshot or drag & drop to get started</p>
          </motion.div>
          <div className="analyzer-grid">
            <div className="analyzer-upload">
              {!image ? (
                <div className={`upload-zone ${isDragging ? 'dragging' : ''}`} onDrop={handleDrop} onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onClick={() => fileRef.current?.click()}>
                  <input ref={fileRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) processFile(f); }} hidden />
                  <motion.div className="upload-icon" animate={isDragging ? { scale: 1.1 } : { scale: 1 }}><Upload size={32} /></motion.div>
                  <p className="upload-title">Drop your chart here</p>
                  <p className="upload-sub">or click to browse · PNG, JPG up to 20MB</p>
                </div>
              ) : (
                <div className="image-preview"><img src={image.url} alt="Chart" /><button className="remove-btn" onClick={handleReset}><X size={16} /></button></div>
              )}
              {image && state !== 'done' && (
                <div className="context-area">
                  <textarea value={context} onChange={(e) => setContext(e.target.value)} placeholder="Add context (optional): timeframe, pair, what you're looking for..." rows={2} />
                  <button className="btn-primary btn-analyze" onClick={handleAnalyze} disabled={state === 'analyzing'}>
                    {state === 'analyzing' ? <><Loader2 size={18} className="spin" /> Analyzing...</> : <><Sparkles size={18} /> Analyze Chart</>}
                  </button>
                </div>
              )}
              <AnimatePresence>
                {state === 'analyzing' && (
                  <motion.div className="loading-state" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <div className="loading-bar"><motion.div className="loading-fill" animate={{ width: ['0%', '90%'] }} transition={{ duration: 25, ease: 'linear' }} /></div>
                    <motion.p key={step} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="loading-text">{steps[step]}</motion.p>
                  </motion.div>
                )}
              </AnimatePresence>
              {error && <motion.div className="error-msg" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><AlertTriangle size={16} /> {error}</motion.div>}
            </div>
            <AnimatePresence>
              {result && state === 'done' && (
                <motion.div className="results" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
                  <div className="bias-badge" style={{ background: bc[result.bias].bg, borderColor: bc[result.bias].border, color: bc[result.bias].color }}>
                    {(() => { const I = bc[result.bias].icon; return <I size={20} />; })()}
                    <span className="bias-label">{bc[result.bias].label}</span>
                    <span className="confidence">{result.confidence}% confidence</span>
                  </div>
                  <div className="result-card"><h3>Summary</h3><p>{result.summary}</p></div>
                  {(result.keyLevels.support.length > 0 || result.keyLevels.resistance.length > 0) && (
                    <div className="result-card levels-card"><h3>Key Levels</h3>
                      <div className="levels-grid">
                        {result.keyLevels.support.length > 0 && <div className="level-group support"><span className="level-label">Support</span>{result.keyLevels.support.map((l, i) => <span key={i} className="level-value">{l}</span>)}</div>}
                        {result.keyLevels.resistance.length > 0 && <div className="level-group resistance"><span className="level-label">Resistance</span>{result.keyLevels.resistance.map((l, i) => <span key={i} className="level-value">{l}</span>)}</div>}
                      </div>
                    </div>
                  )}
                  {result.patterns.length > 0 && <div className="result-card"><h3>Patterns Detected</h3><div className="patterns-list">{result.patterns.map((p, i) => <span key={i} className="pattern-tag">{p}</span>)}</div></div>}
                  <div className="result-card recommendation-card"><h3>Recommendation</h3><p>{result.recommendation}</p></div>
                  <details className="analysis-details"><summary><ChevronDown size={16} /> Full Technical Analysis</summary><div className="analysis-content"><ReactMarkdown>{result.analysis}</ReactMarkdown></div></details>
                  <button className="btn-secondary" onClick={handleReset}>Analyze Another Chart</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand"><div className="logo-icon"><BarChart3 size={18} /></div><span>WIZU</span></div>
          <p className="footer-disclaimer">Educational tool only. Not financial advice. Trade responsibly.</p>
          <p className="footer-copy">&copy; 2026 WIZU. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
export default App;
