import React, { useState, useEffect } from 'react';
import { 
  Database, Search, Filter, RefreshCw, FileText, Anchor, 
  Ship, ArrowUpRight, CheckCircle2, AlertTriangle, ShieldCheck, 
  Download, ChevronLeft, ChevronRight, BarChart3, Activity, Layers, Compass
} from 'lucide-react';
import { apiUrl } from '../utils/api';

export default function AisDatasetExplorer({ selectedPort, onSelectPort }) {
  const [summary, setSummary] = useState(null);
  const [vesselsData, setVesselsData] = useState({ vessels: [], total: 0 });
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPort, setFilterPort] = useState('ALL');
  const [filterType, setFilterType] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [pageOffset, setPageOffset] = useState(0);
  const PAGE_LIMIT = 20;

  // Fetch Dataset Summary
  const fetchSummary = async () => {
    try {
      const res = await fetch(apiUrl('/api/dataset/summary'));
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Error fetching dataset summary:", e);
    }
  };

  // Fetch Filtered Vessels
  const fetchVessels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: PAGE_LIMIT.toString(),
        offset: pageOffset.toString(),
      });
      if (filterPort !== 'ALL') params.append('port_id', filterPort);
      if (filterType !== 'ALL') params.append('type', filterType);
      if (filterStatus !== 'ALL') params.append('status', filterStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(apiUrl(`/api/dataset/vessels?${params.toString()}`));
      if (res.ok) {
        const data = await res.json();
        setVesselsData(data);
      }
    } catch (e) {
      console.error("Error fetching vessels:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchVessels();
  }, [filterPort, filterType, filterStatus, pageOffset, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* 1. DATASET IDENTITY HEADER & METRICS BANNER */}
      <div className="glass-panel p-6 rounded-2xl border border-cyan-500/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-ocean-700/60">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <span className="px-3 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 font-mono text-xs font-bold border border-cyan-500/30 flex items-center">
                <Database className="w-3.5 h-3.5 mr-1.5 text-cyan-400" />
                ACTIVE GROUND TRUTH DATASET
              </span>
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono text-xs font-bold border border-emerald-500/30 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                100% INGESTED & ACTIVE
              </span>
            </div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white font-mono tracking-tight flex items-center">
              <FileText className="w-7 h-7 text-cyan-400 mr-2.5" />
              ais-2026-06-04.csv
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl mt-1">
              Location: <code className="text-cyan-300 font-mono bg-ocean-900/80 px-2 py-0.5 rounded">AIS Vessel Data\ais-2026-06-04.csv</code> • Single consolidated 24-hour national vessel telemetry archive from NOAA Office for Coastal Management (Marine Cadastre).
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="bg-ocean-900/80 p-3 rounded-xl border border-ocean-700/60">
              <span className="text-[10px] text-slate-400 block uppercase">Total Broadcasts</span>
              <span className="text-lg font-bold text-white">4,881,191</span>
              <span className="text-[10px] text-cyan-400 block mt-0.5">Rows Extracted</span>
            </div>
            <div className="bg-ocean-900/80 p-3 rounded-xl border border-ocean-700/60">
              <span className="text-[10px] text-slate-400 block uppercase">Distinct Vessels</span>
              <span className="text-lg font-bold text-cyan-300">20,690</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Unique MMSI</span>
            </div>
            <div className="bg-ocean-900/80 p-3 rounded-xl border border-ocean-700/60">
              <span className="text-[10px] text-slate-400 block uppercase">Dataset Size</span>
              <span className="text-lg font-bold text-amber-400">472.1 MB</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">17 Columns</span>
            </div>
            <div className="bg-ocean-900/80 p-3 rounded-xl border border-ocean-700/60">
              <span className="text-[10px] text-slate-400 block uppercase">AI Model Status</span>
              <span className="text-lg font-bold text-emerald-400">XGBoost</span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Trained on AIS</span>
            </div>
          </div>
        </div>

        {/* Schema Columns Pill Strip */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono text-slate-400 mr-1 flex items-center">
            <Layers className="w-3.5 h-3.5 mr-1 text-cyan-400" /> Schema (17 features):
          </span>
          {[
            'mmsi', 'base_date_time', 'latitude', 'longitude', 'sog', 'cog', 'heading',
            'vessel_name', 'imo', 'call_sign', 'vessel_type', 'status', 'length',
            'width', 'draft', 'cargo', 'transceiver'
          ].map((col) => (
            <span key={col} className="text-[11px] font-mono bg-ocean-950/80 text-cyan-300 px-2 py-0.5 rounded border border-ocean-700">
              {col}
            </span>
          ))}
        </div>
      </div>

      {/* 2. REAL AIS PORT-LEVEL AGGREGATION & QUEUE BREAKDOWN TABLE */}
      <div className="glass-panel p-5 rounded-2xl border border-ocean-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-ocean-800">
          <div>
            <h2 className="text-base font-bold text-white font-mono flex items-center">
              <Anchor className="w-4 h-4 text-cyan-400 mr-2" />
              Real AIS Operational Aggregations Across 8 US Deepwater Hubs
            </h2>
            <p className="text-xs text-slate-400">
              Derived directly from the 4.88M rows in <code className="text-cyan-300 font-mono">ais-2026-06-04.csv</code> via spatial geofencing & navigation status classification
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
            DATE: 2026-06-04
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-ocean-900/80 text-slate-300 border-b border-ocean-800">
                <th className="p-3">Port Code</th>
                <th className="p-3">Facility Name</th>
                <th className="p-3 text-right">AIS Broadcasts</th>
                <th className="p-3 text-right">Distinct Fleet</th>
                <th className="p-3 text-right">Anchored Queue</th>
                <th className="p-3 text-right">Berthed Docks</th>
                <th className="p-3 text-right">Inbound Flow</th>
                <th className="p-3 text-right">Berth Saturation</th>
                <th className="p-3 text-right">Queue Ratio</th>
                <th className="p-3 text-right">Avg Draft</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-800/60 text-slate-200">
              {summary?.ports_breakdown?.map((p) => {
                const isSelected = p.id === selectedPort;
                return (
                  <tr 
                    key={p.id}
                    onClick={() => onSelectPort && onSelectPort(p.id)}
                    className={`hover:bg-ocean-800/50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400 font-semibold' : ''
                    }`}
                  >
                    <td className="p-3 font-bold text-cyan-400 flex items-center">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 mr-2"></span>
                      {p.id}
                    </td>
                    <td className="p-3 text-white truncate max-w-[200px]">{p.name}</td>
                    <td className="p-3 text-right font-bold text-slate-300">{p.ais_pings?.toLocaleString()}</td>
                    <td className="p-3 text-right text-cyan-300">{p.distinct_vessels}</td>
                    <td className="p-3 text-right font-bold text-amber-400">{p.anchored_queue}</td>
                    <td className="p-3 text-right text-emerald-400">{p.berthed_count}</td>
                    <td className="p-3 text-right text-slate-300">{p.inbound_count}</td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        p.berth_utilization_pct > 80 ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {p.berth_utilization_pct}%
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-amber-300">{p.anchorage_queue_ratio}%</td>
                    <td className="p-3 text-right text-slate-300">{p.avg_draft_m}m</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. LIVE AIS VESSEL EXPLORER & TELEMETRY QUERY TABLE */}
      <div className="glass-panel p-5 rounded-2xl border border-ocean-700/60 shadow-xl space-y-4">
        
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-ocean-800">
          <div>
            <h3 className="text-base font-bold text-white font-mono flex items-center">
              <Ship className="w-4 h-4 text-cyan-400 mr-2" />
              AIS Vessel Telemetry Records (Live Query on ais-2026-06-04.csv)
            </h3>
            <p className="text-xs text-slate-400">
              Showing {vesselsData.vessels?.length || 0} of {vesselsData.total || 0} matching vessels in the active database
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Vessel / MMSI / IMO..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPageOffset(0); }}
                className="pl-8 pr-3 py-1.5 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 w-48 font-mono"
              />
            </div>

            {/* Port Filter */}
            <select
              value={filterPort}
              onChange={(e) => { setFilterPort(e.target.value); setPageOffset(0); }}
              className="px-3 py-1.5 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All 8 Ports</option>
              <option value="USLAX">Port of Los Angeles</option>
              <option value="USHOU">Port of Houston</option>
              <option value="USNYC">Port of New York/NJ</option>
              <option value="USSAV">Port of Savannah</option>
              <option value="USMSY">Port of New Orleans</option>
              <option value="USSEA">Port of Seattle</option>
              <option value="USMIA">PortMiami</option>
              <option value="USCRP">Port of Corpus Christi</option>
            </select>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => { setFilterType(e.target.value); setPageOffset(0); }}
              className="px-3 py-1.5 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Types</option>
              <option value="Cargo">Cargo Vessels (70-79)</option>
              <option value="Tanker">Tankers (80-89)</option>
              <option value="Tug">Tug / Towing (31, 52)</option>
              <option value="Passenger">Passenger (60-69)</option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPageOffset(0); }}
              className="px-3 py-1.5 rounded-xl bg-ocean-950 border border-ocean-700 text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-400"
            >
              <option value="ALL">All Nav Statuses</option>
              <option value="Anchored">Anchored (Queue)</option>
              <option value="Berthed">Berthed (Moored)</option>
              <option value="Underway">Underway (Approach)</option>
            </select>
          </div>
        </div>

        {/* Vessel Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="bg-ocean-900/80 text-slate-300 border-b border-ocean-800">
                <th className="p-3">MMSI</th>
                <th className="p-3">Vessel Name</th>
                <th className="p-3">Vessel Type</th>
                <th className="p-3">Nav Status</th>
                <th className="p-3 text-right">SOG (kts)</th>
                <th className="p-3 text-right">COG (deg)</th>
                <th className="p-3 text-right">Draft (m)</th>
                <th className="p-3 text-right">Length x Width</th>
                <th className="p-3">Port Geofence</th>
                <th className="p-3">Call Sign / IMO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ocean-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400">
                    <div className="flex items-center justify-center space-x-2">
                      <div className="w-4 h-4 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
                      <span>Querying ais-2026-06-04.csv database...</span>
                    </div>
                  </td>
                </tr>
              ) : vesselsData.vessels?.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-500">
                    No vessels found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                vesselsData.vessels?.map((v) => {
                  let statusBadge = "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
                  if (v.status === 'Anchored') statusBadge = "bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold";
                  if (v.status === 'Berthed') statusBadge = "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";

                  return (
                    <tr key={v.mmsi} className="hover:bg-ocean-800/40 transition-colors">
                      <td className="p-3 text-cyan-300 font-bold">{v.mmsi}</td>
                      <td className="p-3 font-semibold text-white truncate max-w-[180px]">{v.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-ocean-950 border border-ocean-700 text-slate-300">
                          {v.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${statusBadge}`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold text-white">{v.sog}</td>
                      <td className="p-3 text-right text-slate-400">{v.cog}°</td>
                      <td className="p-3 text-right text-emerald-400 font-semibold">{v.draft}m</td>
                      <td className="p-3 text-right text-slate-400">{v.length}m × {v.width}m</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px]">
                          {v.port_id}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 text-[11px]">{v.call_sign} • {v.imo}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex items-center justify-between pt-3 border-t border-ocean-800 font-mono text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{pageOffset + 1}</strong> to <strong className="text-white">{Math.min(pageOffset + PAGE_LIMIT, vesselsData.total)}</strong> of <strong className="text-white">{vesselsData.total}</strong> vessels
          </span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPageOffset(prev => Math.max(0, prev - PAGE_LIMIT))}
              disabled={pageOffset === 0}
              className="px-3 py-1.5 rounded-lg border border-ocean-700 bg-ocean-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ocean-800 text-slate-200 transition-all flex items-center space-x-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPageOffset(prev => prev + PAGE_LIMIT)}
              disabled={pageOffset + PAGE_LIMIT >= vesselsData.total}
              className="px-3 py-1.5 rounded-lg border border-ocean-700 bg-ocean-900 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-ocean-800 text-slate-200 transition-all flex items-center space-x-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 4. METHODOLOGY & PROJECT OBJECTIVES GROUNDING CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 font-mono text-xs">
        <div className="glass-panel p-5 rounded-2xl border border-ocean-700/60 shadow-xl space-y-2">
          <div className="flex items-center space-x-2 text-cyan-400 font-bold text-sm mb-2">
            <Activity className="w-4 h-4" />
            <span>1. Defining Congestion</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans">
            Congestion is quantitatively modeled as deviations exceeding expected 24h turnaround times, driven by <strong>Anchorage Queue Ratios (&gt;0.70)</strong> and <strong>Quayside Berth Saturation (&gt;0.75)</strong> calculated directly from AIS position records.
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-ocean-700/60 shadow-xl space-y-2">
          <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm mb-2">
            <BarChart3 className="w-4 h-4" />
            <span>2. Dual AI Architecture</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans">
            Trained on multi-window operational snapshots derived from <strong>ais-2026-06-04.csv</strong>: XGBoost Classifier delivers calibrated congestion probabilities (88.8% accuracy, 0.978 ROC-AUC) while XGBoost Regressor forecasts expected delay hours (0.74h MAE).
          </p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-ocean-700/60 shadow-xl space-y-2">
          <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>3. Interpretable Explanations</span>
          </div>
          <p className="text-slate-300 leading-relaxed font-sans">
            NVIDIA Nemotron 3.5 AI synthesizes directional factor attributions directly from the live AIS observables: isolating anchorage queue pressure, cross-wind weather disruptions, and deep draft vessel arrival spikes into actionable logistics strategies.
          </p>
        </div>
      </div>

    </div>
  );
}

