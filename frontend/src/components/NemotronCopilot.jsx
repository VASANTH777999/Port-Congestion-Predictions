import React, { useState } from 'react';
import { Cpu, Send, Bot, User, CheckCircle2, AlertTriangle, ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { apiUrl } from '../utils/api';

export default function NemotronCopilot({ selectedPort, currentPortData, externalExplanation = null }) {
  const [explanation, setExplanation] = useState(externalExplanation);
  const [isExplaining, setIsExplaining] = useState(false);

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Greetings. I am the Aiqon Maritime Operations Copilot powered by NVIDIA Nemotron 3.5. I am continuously analyzing live vessel telemetry, anchorage densities, and arrival queues for ${currentPortData?.metadata?.name || 'monitored ports'}. How can I assist your logistics or terminal dispatch operations today?`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fetchExplanation = async () => {
    setIsExplaining(true);
    try {
      const res = await fetch(apiUrl('/api/explain/port'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port_id: selectedPort,
          prediction_data: currentPortData?.prediction
        })
      });
      if (res.ok) {
        const data = await res.json();
        setExplanation(data);
      }
    } catch (err) {
      console.error("Explanation error:", err);
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const q = textToSend || inputQuery;
    if (!q.trim()) return;

    const newMsgs = [...messages, { role: 'user', content: q }];
    setMessages(newMsgs);
    setInputQuery('');
    setIsChatLoading(true);

    try {
      const res = await fetch(apiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          port_id: selectedPort
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...newMsgs, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages([...newMsgs, { role: 'assistant', content: "Unable to reach NVIDIA NIM inference endpoint. Operating on maritime fallback rules." }]);
      }
    } catch (err) {
      setMessages([...newMsgs, { role: 'assistant', content: "Network error connecting to Copilot API. Please verify backend connection." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const quickPrompts = [
    `How does current anchorage queue impact turnaround at ${currentPortData?.metadata?.name?.split(' ')[2] || 'this port'}?`,
    "What demurrage mitigation should approaching container ships take?",
    "Explain the correlation between wind speed and fairway berthing delays."
  ];

  const portName = currentPortData?.metadata?.name || "Target Port";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Structured Executive Explanation */}
      <div className="lg:col-span-6 space-y-4">
        <div className="glass-panel rounded-2xl p-5 border border-cyan-500/30 shadow-xl relative overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-ocean-700/60">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
                <Cpu className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">NVIDIA Nemotron 3.5 Executive Briefing</h3>
                <p className="text-[11px] text-slate-400 font-mono">MODEL: nvidia/nemotron-3.5-lightning-30b-a3b</p>
              </div>
            </div>
            <button
              onClick={fetchExplanation}
              disabled={isExplaining}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 flex items-center space-x-1.5 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isExplaining ? 'animate-spin' : ''}`} />
              <span>{isExplaining ? 'Analyzing...' : 'Generate Briefing'}</span>
            </button>
          </div>

          {/* Explanation Content */}
          {explanation ? (
            <div className="space-y-4 text-xs text-slate-200">
              {/* Executive Summary */}
              <div className="bg-ocean-900/60 p-3.5 rounded-xl border border-ocean-700">
                <span className="text-[11px] font-mono font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                  1. Executive Summary:
                </span>
                <p className="leading-relaxed text-slate-200">{explanation.executive_summary}</p>
              </div>

              {/* Root Cause Analysis */}
              <div className="bg-ocean-900/60 p-3.5 rounded-xl border border-ocean-700">
                <span className="text-[11px] font-mono font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  2. Root Cause Diagnostic:
                </span>
                <p className="leading-relaxed text-slate-300">{explanation.root_cause_analysis}</p>
              </div>

              {/* Actionable Recommendations */}
              <div className="bg-ocean-900/60 p-3.5 rounded-xl border border-ocean-700">
                <span className="text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wider block mb-2">
                  3. Actionable Operational Directives:
                </span>
                <ul className="space-y-2">
                  {explanation.actionable_recommendations?.map((rec, i) => (
                    <li key={i} className="flex items-start space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span className="text-slate-300 leading-normal">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Operational Posture */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 font-mono text-[11px]">POSTURE ASSESSMENT:</span>
                <span className="bg-cyan-500/10 text-cyan-300 px-3 py-1 rounded-full border border-cyan-500/30 font-bold uppercase tracking-wider text-[11px]">
                  {explanation.operational_posture || 'ELEVATED MITIGATION'}
                </span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 space-y-3">
              <Sparkles className="w-10 h-10 text-cyan-400/50 mx-auto animate-pulse" />
              <p className="text-sm">Click "Generate Briefing" to run full executive reasoning on {portName}.</p>
              <button
                onClick={fetchExplanation}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-ocean-600 text-ocean-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 hover:from-cyan-400"
              >
                Synthesize Port Telemetry with Nemotron
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Conversational Maritime Copilot */}
      <div className="lg:col-span-6 glass-panel rounded-2xl p-5 border border-ocean-700/60 shadow-xl flex flex-col h-[580px]">
        {/* Chat Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-ocean-800">
          <div className="flex items-center space-x-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="font-bold text-white text-sm">Interactive Maritime Copilot</h3>
              <p className="text-[10px] text-slate-400 font-mono">Live Q&A on port physics, berth sequencing & weather</p>
            </div>
          </div>
          <span className="flex items-center text-[11px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-ping"></span>
            CONNECTED
          </span>
        </div>

        {/* Message History */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center flex-shrink-0 mt-0.5 border border-cyan-500/40">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}
              <div
                className={`p-3 rounded-xl max-w-[85%] leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-500/30'
                    : 'bg-ocean-900/80 text-slate-200 border border-ocean-700/60 shadow-md'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-slate-700 text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          ))}

          {isChatLoading && (
            <div className="flex items-center space-x-2 text-cyan-400 font-mono text-[11px] p-2 bg-ocean-900/40 rounded-lg w-fit">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce delay-100"></span>
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce delay-200"></span>
              <span>NVIDIA Nemotron reasoning...</span>
            </div>
          )}
        </div>

        {/* Suggested Quick Prompts */}
        <div className="py-2 border-t border-ocean-800/60">
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
            {quickPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(p)}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-ocean-900 hover:bg-ocean-800 text-slate-300 border border-ocean-700 transition-all text-left"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input Box */}
        <div className="pt-2 flex items-center space-x-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={`Ask Nemotron about delays, demurrage, or berthing at ${portName}...`}
            className="flex-1 bg-ocean-900/90 text-white placeholder-slate-500 border border-ocean-700 rounded-xl px-3.5 py-2 text-xs focus:outline-none focus:border-cyan-400 font-sans"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={isChatLoading || !inputQuery.trim()}
            className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-ocean-950 font-bold transition-all disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

