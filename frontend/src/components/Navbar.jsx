import React, { useState, useEffect } from 'react';
import { Anchor, Activity, Compass, Cpu, Ship, BarChart3, Radio, Layers, Box, Database } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, selectedPort, setSelectedPort, ports }) {
  const [time, setTime] = useState(new Date().toUTCString().slice(17, 25));

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems = [
    { id: 'overview', label: 'Command Overview', icon: Layers },
    { id: 'dataset', label: 'AIS Dataset Explorer', icon: Database },
    { id: '3d-twin', label: 'Port Twin & Live 4K Cam', icon: Box },
    { id: 'map', label: 'Geospatial AIS Map', icon: Compass },
    { id: 'simulator', label: 'AI Predictor & Simulator', icon: Activity },
    { id: 'shipments', label: 'Shipments & Delays', icon: Ship },
    { id: 'copilot', label: 'NVIDIA Nemotron AI', icon: Cpu },
    { id: 'evaluation', label: 'Model Metrics Hub', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-50 bg-ocean-950/90 backdrop-blur-md border-b border-ocean-700/40">
      {/* Top Telemetry Strip */}
      <div className="px-4 py-1 bg-ocean-900/80 border-b border-ocean-800 text-xs flex flex-wrap items-center justify-between text-slate-400 font-mono">
        <div className="flex items-center space-x-4">
          <span className="flex items-center text-cyan-400">
            <span className="w-2 h-2 rounded-full bg-cyan-400 mr-1.5 animate-ping"></span>
            ACTIVE DATASET: ais-2026-06-04.csv (4.88M RECORDS • NOAA MARINE CADASTRE)
          </span>
          <span className="hidden md:inline text-slate-500">|</span>
          <span className="hidden md:inline text-slate-300">
            AI ENGINES: <span className="text-emerald-400">XGBOOST ENSEMBLE</span> & <span className="text-violet-400">NVIDIA NEMOTRON 3.5</span>
          </span>
        </div>
        <div className="flex items-center space-x-3 text-cyan-300">
          <span>UTC: {time}</span>
          <span className="bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 font-sans text-[11px] font-semibold">
            STATUS: ACTIVE
          </span>
        </div>
      </div>

      {/* Main Nav Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-ocean-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 border border-cyan-400/30">
            <Anchor className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="text-xl font-bold tracking-wider text-white font-mono">AIQON</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-400/30">
                MARITIME AI
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-none">Port Congestion & Delay Forecasting</p>
          </div>
        </div>

        {/* Port Selector Dropdown */}
        <div className="hidden lg:flex items-center bg-ocean-900 border border-ocean-700/60 rounded-lg px-3 py-1.5">
          <span className="text-xs text-slate-400 font-mono mr-2">MONITORING PORT:</span>
          <select 
            value={selectedPort}
            onChange={(e) => setSelectedPort(e.target.value)}
            className="bg-transparent text-sm font-semibold text-cyan-300 focus:outline-none cursor-pointer"
          >
            {ports.map((p) => (
              <option key={p.id} value={p.id} className="bg-ocean-900 text-slate-200">
                {p.name} ({p.id}) - {p.risk_badge}
              </option>
            ))}
          </select>
        </div>

        {/* View Switcher Tabs */}
        <nav className="flex items-center space-x-1 overflow-x-auto py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  active 
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 font-semibold' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-ocean-800/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${active ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

