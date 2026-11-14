import React, { useState, useEffect } from 'react';
import { Activity, Clock, ShieldCheck, AlertCircle, RefreshCw, Sliders, Zap, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { apiUrl } from '../utils/api';

export default function CongestionSimulator({ selectedPort, portDetail, onTriggerExplanation }) {
  const defaultMetrics = portDetail?.prediction?.operational_metrics || {};

  // Simulator Sliders State
  const [inboundVessels, setInboundVessels] = useState(defaultMetrics.inbound_vessels || 18);
  const [anchoredVessels, setAnchoredVessels] = useState(defaultMetrics.anchored_vessels || 22);
  const [berthedVessels, setBerthedVessels] = useState(defaultMetrics.berthed_vessels || 45);
  const [windKnots, setWindKnots] = useState(defaultMetrics.wind_speed_knots || 14);
  const [visibilityNm, setVisibilityNm] = useState(defaultMetrics.visibility_nm || 8.5);
  const [craneUtil, setCraneUtil] = useState(defaultMetrics.crane_utilization_pct || 80);

  const [predictionResult, setPredictionResult] = useState(portDetail?.prediction || null);
  const [isLoading, setIsLoading] = useState(false);

  // Sync when selected port changes
  useEffect(() => {
    if (portDetail?.prediction) {
      setPredictionResult(portDetail.prediction);
      const m = portDetail.prediction.operational_metrics || {};
      setInboundVessels(m.inbound_vessels || 18);
      setAnchoredVessels(m.anchored_vessels || 22);
      setBerthedVessels(m.berthed_vessels || 45);
      setWindKnots(m.wind_speed_knots || 14);
      setVisibilityNm(m.visibility_nm || 8.5);
      setCraneUtil(m.crane_utilization_pct || 80);
    }
  }, [portDetail]);

  // Debounced API Call when sliders move
  useEffect(() => {
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const payload = {
          port_id: selectedPort,
          custom_params: {
            inbound_vessels_count: Number(inboundVessels),
            anchored_vessels_count: Number(anchoredVessels),
            berthed_vessels_count: Number(berthedVessels),
            weather_wind_knots: Number(windKnots),
            visibility_nm: Number(visibilityNm),
            crane_util_pct: Number(craneUtil) / 100.0,
          }
        };

        const res = await fetch(apiUrl('/api/predict/port'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          setPredictionResult(data);
        }
      } catch (err) {
        console.error("Simulation error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [inboundVessels, anchoredVessels, berthedVessels, windKnots, visibilityNm, craneUtil, selectedPort]);

  // Quick Scenarios
  const applyScenario = (type) => {
    if (type === 'optimal') {
      setInboundVessels(10);
      setAnchoredVessels(8);
      setBerthedVessels(35);
      setWindKnots(8);
      setVisibilityNm(12.0);
      setCraneUtil(92);
    } else if (type === 'surge') {
      setInboundVessels(38);
      setAnchoredVessels(36);
      setBerthedVessels(58);
      setWindKnots(16);
      setVisibilityNm(7.0);
      setCraneUtil(85);
    } else if (type === 'storm') {
      setInboundVessels(24);
      setAnchoredVessels(42);
      setBerthedVessels(48);
      setWindKnots(38);
      setVisibilityNm(1.5);
      setCraneUtil(60);
    } else if (type === 'labor') {
      setInboundVessels(22);
      setAnchoredVessels(32);
      setBerthedVessels(52);
      setWindKnots(12);
      setVisibilityNm(9.0);
      setCraneUtil(45);
    }
  };

  const likelihood = predictionResult?.congestion_likelihood_pct || 50;
  const delayHours = predictionResult?.expected_delay_hours || 12.0;
  const conf = predictionResult?.confidence_score_pct || 80.0;
  const riskColor = predictionResult?.risk_color || '#f59e0b';
  const riskBadge = predictionResult?.risk_badge || 'MODERATE';
  const factors = predictionResult?.top_contributing_factors || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Left Column: Interactive Simulation Sliders */}
      <div className="lg:col-span-6 glass-panel rounded-2xl p-5 border border-ocean-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ocean-800">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-white text-base">What-If Scenario Controls</h3>
          </div>
          <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
            {isLoading ? 'CALCULATING...' : 'LIVE INFERENCE'}
          </span>
        </div>

        {/* Quick Scenario Preset Buttons */}
        <div>
          <label className="text-xs text-slate-400 font-mono block mb-1.5 uppercase">Quick Stress-Test Scenarios:</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              onClick={() => applyScenario('optimal')}
              className="px-2 py-1.5 text-xs font-medium rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all"
            >
              Optimal Flow
            </button>
            <button
              onClick={() => applyScenario('surge')}
              className="px-2 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
            >
              Inbound Surge
            </button>
            <button
              onClick={() => applyScenario('storm')}
              className="px-2 py-1.5 text-xs font-medium rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 transition-all"
            >
              Gale / Fog Storm
            </button>
            <button
              onClick={() => applyScenario('labor')}
              className="px-2 py-1.5 text-xs font-medium rounded-lg bg-violet-500/10 text-violet-300 border border-violet-500/30 hover:bg-violet-500/20 transition-all"
            >
              Crane Slowdown
            </button>
          </div>
        </div>

        {/* Sliders List */}
        <div className="space-y-4 pt-1">
          {/* Inbound vessels */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Inbound Vessel Traffic (24h Window)</span>
              <span className="font-mono text-cyan-400 font-bold">{inboundVessels} ships</span>
            </div>
            <input
              type="range"
              min="2"
              max="60"
              value={inboundVessels}
              onChange={(e) => setInboundVessels(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-ocean-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>Light (2)</span>
              <span>Nominal (18)</span>
              <span>Ultra Heavy (60)</span>
            </div>
          </div>

          {/* Anchored vessels queue */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Anchorage Waiting Queue (Outer Basin)</span>
              <span className="font-mono text-amber-400 font-bold">{anchoredVessels} ships</span>
            </div>
            <input
              type="range"
              min="0"
              max="60"
              value={anchoredVessels}
              onChange={(e) => setAnchoredVessels(Number(e.target.value))}
              className="w-full accent-amber-400 bg-ocean-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>Clear (0)</span>
              <span>Moderate (20)</span>
              <span>Severe Saturation (60)</span>
            </div>
          </div>

          {/* Active Berthed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Active Berthed Vessels</span>
              <span className="font-mono text-emerald-400 font-bold">{berthedVessels} berths occupied</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              value={berthedVessels}
              onChange={(e) => setBerthedVessels(Number(e.target.value))}
              className="w-full accent-emerald-400 bg-ocean-900 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Wind Speed */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Cross-Wind Velocity</span>
              <span className="font-mono text-slate-200 font-bold">{windKnots} knots</span>
            </div>
            <input
              type="range"
              min="2"
              max="50"
              value={windKnots}
              onChange={(e) => setWindKnots(Number(e.target.value))}
              className="w-full accent-cyan-400 bg-ocean-900 h-1.5 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-0.5">
              <span>Calm (2 kts)</span>
              <span>Moderate (15 kts)</span>
              <span>Gale Force (50 kts)</span>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Fairway Visibility (Fog Level)</span>
              <span className="font-mono text-slate-200 font-bold">{visibilityNm} nautical miles</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="15.0"
              step="0.5"
              value={visibilityNm}
              onChange={(e) => setVisibilityNm(Number(e.target.value))}
              className="w-full accent-indigo-400 bg-ocean-900 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Crane efficiency */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Terminal Gantry Crane Efficiency</span>
              <span className="font-mono text-cyan-300 font-bold">{craneUtil}%</span>
            </div>
            <input
              type="range"
              min="30"
              max="100"
              value={craneUtil}
              onChange={(e) => setCraneUtil(Number(e.target.value))}
              className="w-full accent-cyan-300 bg-ocean-900 h-1.5 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Right Column: AI Predictions & Factor Waterfall */}
      <div className="lg:col-span-6 space-y-4">
        {/* Core Prediction Gauges */}
        <div className="glass-panel rounded-2xl p-5 border border-ocean-700/60 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-ocean-800">
            <h3 className="font-bold text-white text-base flex items-center">
              <Zap className="w-5 h-5 text-amber-400 mr-2" />
              Real-Time AI Congestion Forecast
            </h3>
            <span 
              className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border"
              style={{ color: riskColor, borderColor: `${riskColor}55`, backgroundColor: `${riskColor}15` }}
            >
              {riskBadge}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            {/* Congestion Likelihood */}
            <div className="glass-panel p-4 rounded-xl border border-ocean-800 bg-ocean-900/40">
              <span className="text-[11px] text-slate-400 uppercase font-mono block mb-1">Likelihood</span>
              <div className="text-3xl font-extrabold font-mono" style={{ color: riskColor }}>
                {likelihood}%
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Risk Probability</span>
            </div>

            {/* Expected Delay */}
            <div className="glass-panel p-4 rounded-xl border border-ocean-800 bg-ocean-900/40">
              <span className="text-[11px] text-slate-400 uppercase font-mono block mb-1">Turnaround Delay</span>
              <div className="text-3xl font-extrabold font-mono text-rose-400">
                {delayHours} <span className="text-sm font-sans text-slate-300">hrs</span>
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Average Ship Wait</span>
            </div>

            {/* Confidence Score */}
            <div className="glass-panel p-4 rounded-xl border border-ocean-800 bg-ocean-900/40">
              <span className="text-[11px] text-slate-400 uppercase font-mono block mb-1">AI Confidence</span>
              <div className="text-3xl font-extrabold font-mono text-emerald-400">
                {conf}%
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">Calibrated Certainty</span>
            </div>
          </div>

          {/* Multi-class Probability Breakdown Bar */}
          <div className="mt-4 pt-3 border-t border-ocean-800/80">
            <div className="flex justify-between text-xs text-slate-400 mb-1.5 font-mono">
              <span>PROBABILITY DISTRIBUTION:</span>
              <span>LOW: {predictionResult?.probabilities?.low || 15}% • MODERATE: {predictionResult?.probabilities?.moderate || 35}% • SEVERE: {predictionResult?.probabilities?.severe || 50}%</span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-ocean-900 flex overflow-hidden border border-ocean-700">
              <div style={{ width: `${predictionResult?.probabilities?.low || 20}%` }} className="bg-emerald-500 h-full" title="Low"></div>
              <div style={{ width: `${predictionResult?.probabilities?.moderate || 40}%` }} className="bg-amber-500 h-full" title="Moderate"></div>
              <div style={{ width: `${predictionResult?.probabilities?.severe || 40}%` }} className="bg-rose-500 h-full" title="Severe"></div>
            </div>
          </div>

          {/* Trigger LLM Explanation Button */}
          <div className="mt-4">
            <button
              onClick={() => onTriggerExplanation && onTriggerExplanation(predictionResult)}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-ocean-600 hover:from-cyan-400 hover:to-ocean-500 text-ocean-950 font-bold text-xs font-mono uppercase tracking-wider shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2 transition-all transform hover:-translate-y-0.5"
            >
              <span>Explain with NVIDIA Nemotron 3.5 AI</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Explainable AI: Feature Attribution Waterfall */}
        <div className="glass-panel rounded-2xl p-5 border border-ocean-700/60 shadow-xl">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-ocean-800">
            <h4 className="font-bold text-white text-sm">Key Driving Factors (SHAP Feature Attribution)</h4>
            <span className="text-[11px] text-slate-400 font-mono">Relative Directional Impact</span>
          </div>

          <div className="space-y-2.5">
            {factors.slice(0, 5).map((f, idx) => {
              const isIncrease = f.direction === 'increases_delay';
              const isDecrease = f.direction === 'decreases_delay';
              return (
                <div key={idx} className="flex items-center justify-between text-xs bg-ocean-900/60 p-2 rounded-lg border border-ocean-800">
                  <div className="flex items-center space-x-2">
                    {isIncrease ? (
                      <ArrowUpRight className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    ) : isDecrease ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Minus className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span className="text-slate-200 font-medium">{f.name}</span>
                  </div>
                  <div className="flex items-center space-x-2 font-mono">
                    <span className="text-slate-400">val: {f.current_value}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isIncrease ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {isIncrease ? '+ Delay' : '- Delay'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

