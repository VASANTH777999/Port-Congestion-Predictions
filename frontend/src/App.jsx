import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import KPIRow from './components/KPIRow';
import ThreeDigitalTwin from './components/ThreeDigitalTwin';
import PortMap from './components/PortMap';
import CongestionSimulator from './components/CongestionSimulator';
import NemotronCopilot from './components/NemotronCopilot';
import ShipmentTracker from './components/ShipmentTracker';
import ModelEvaluationHub from './components/ModelEvaluationHub';
import AisDatasetExplorer from './components/AisDatasetExplorer';
import { Anchor, Activity, Clock, ShieldAlert, Ship, ArrowRight, ExternalLink, RefreshCw, Cpu, Layers, Database } from 'lucide-react';
import { apiUrl } from './utils/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedPort, setSelectedPort] = useState('USLAX');

  const [ports, setPorts] = useState([]);
  const [portDetail, setPortDetail] = useState(null);
  const [shipmentsData, setShipmentsData] = useState({ shipments: [], summary: {} });
  const [metrics, setMetrics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [externalExplanation, setExternalExplanation] = useState(null);

  // 1. Initial Load of Ports & Shipments
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [pRes, sRes, mRes] = await Promise.all([
          fetch(apiUrl('/api/ports')),
          fetch(apiUrl('/api/shipments?limit=25000')),
          fetch(apiUrl('/api/metrics'))
        ]);

        if (pRes.ok) {
          const pJson = await pRes.json();
          setPorts(pJson.ports || []);
        }
        if (sRes.ok) {
          const sJson = await sRes.json();
          setShipmentsData(sJson);
        }
        if (mRes.ok) {
          const mJson = await mRes.json();
          setMetrics(mJson);
        }
      } catch (err) {
        console.error("Failed to load initial data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // 2. Fetch Detail for Selected Port
  useEffect(() => {
    async function fetchPortDetail() {
      try {
        const res = await fetch(apiUrl(`/api/ports/${selectedPort}`));
        if (res.ok) {
          const data = await res.json();
          setPortDetail(data);
        }
      } catch (err) {
        console.error("Port detail fetch error:", err);
      }
    }
    fetchPortDetail();
  }, [selectedPort]);

  // Handle triggering explanation from Simulator
  const handleTriggerExplanation = async (predResult) => {
    setActiveTab('copilot');
    try {
      const res = await fetch(apiUrl('/api/explain/port'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port_id: selectedPort,
          prediction_data: predResult
        })
      });
      if (res.ok) {
        const data = await res.json();
        setExternalExplanation(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ocean-950 flex flex-col items-center justify-center space-y-4 font-mono text-cyan-400">
        <div className="w-12 h-12 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin"></div>
        <p className="tracking-widest text-sm">INITIALIZING AIQON MARITIME AI PLATFORM...</p>
        <p className="text-xs text-slate-500">Connecting to AIS telemetry & XGBoost inference engine</p>
      </div>
    );
  }

  const currentPortMeta = ports.find((p) => p.id === selectedPort) || ports[0];

  return (
    <div className="min-h-screen bg-ocean-950 flex flex-col text-slate-100">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        selectedPort={selectedPort}
        setSelectedPort={setSelectedPort}
        ports={ports}
      />

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Global KPIs */}
        <KPIRow
          ports={ports}
          shipmentsSummary={shipmentsData.summary}
          currentPortData={portDetail}
        />

        {/* View 1: Command Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Top Split: 3D Twin Teaser + Port Status Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 3D Digital Twin Viewport */}
              <div className="lg:col-span-7">
                <ThreeDigitalTwin selectedPortData={portDetail} />
              </div>

              {/* Monitored Ports Quick Cards */}
              <div className="lg:col-span-5 glass-panel rounded-2xl p-5 border border-ocean-700/60 shadow-xl flex flex-col">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-ocean-800">
                  <div className="flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-white text-sm uppercase tracking-wider font-mono">
                      National Port Network Status
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">8 KEY US HUBS</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[510px]">
                  {ports.map((p) => {
                    const isSelected = p.id === selectedPort;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPort(p.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-cyan-500/10 border-cyan-400 shadow-md shadow-cyan-500/10'
                            : 'bg-ocean-900/60 border-ocean-800 hover:border-ocean-700 hover:bg-ocean-900'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs truncate max-w-[200px]">{p.name}</span>
                          <span 
                            className="text-[10px] font-bold px-2 py-0.5 rounded font-mono border"
                            style={{ color: p.risk_color, borderColor: `${p.risk_color}55`, backgroundColor: `${p.risk_color}15` }}
                          >
                            {p.risk_badge}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 font-mono">
                          <span>Congestion: <strong className="text-white">{p.congestion_likelihood_pct}%</strong></span>
                          <span>Delay: <strong className="text-amber-400">+{p.expected_delay_hours} hrs</strong></span>
                          <span>Queue: <strong className="text-cyan-300">{p.anchored_count || 18} ships</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Quick Actions / Port Map Section */}
            <div className="glass-panel rounded-2xl p-5 border border-ocean-700/60 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-ocean-800">
                <div>
                  <h3 className="font-bold text-white text-base">Live Geospatial Fleet Radar & Anchorages</h3>
                  <p className="text-xs text-slate-400">All 20,690 unique commercial vessels extracted from NOAA AIS telemetry dataset across US coast and open waters</p>
                </div>
                <button
                  onClick={() => setActiveTab('map')}
                  className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center space-x-1.5 hover:bg-cyan-500/30 transition-all"
                >
                  <span>Expand Port Radar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <PortMap
                ports={ports}
                selectedPort={selectedPort}
                onSelectPort={(pid) => setSelectedPort(pid)}
                portDetail={portDetail}
                allShipments={shipmentsData.shipments}
                initialScope="all_unique"
                viewTitle="LIVE GEOSPATIAL FLEET RADAR & ANCHORAGES (ALL 20,690 VESSELS)"
              />
            </div>
          </div>
        )}

        {/* View 2: AIS Dataset & Telemetry Explorer */}
        {activeTab === 'dataset' && (
          <AisDatasetExplorer
            selectedPort={selectedPort}
            onSelectPort={(pid) => setSelectedPort(pid)}
          />
        )}

        {/* View 3: 3D Digital Twin Dedicated View */}
        {activeTab === '3d-twin' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white font-mono flex items-center">
                  <span className="w-3 h-3 rounded-full bg-cyan-400 mr-2 animate-ping"></span>
                  Ultra-Realistic Port Digital Twin & Live 4K Harbor Camera
                </h2>
                <p className="text-xs text-slate-400">Authentic physical harbor presence with real-time AIS vessel telemetry, STS crane metrics, and interactive optical PTZ controls</p>
              </div>
              <span className="text-xs font-mono text-cyan-300 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/30">
                ACTIVE PORT: {currentPortMeta?.name}
              </span>
            </div>
            <ThreeDigitalTwin selectedPortData={portDetail} />
          </div>
        )}

        {/* View 3: Geospatial AIS Radar Map */}
        {activeTab === 'map' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-white font-mono flex items-center">
                  <Anchor className="w-5 h-5 text-cyan-400 mr-2" />
                  Live Geospatial AIS Maritime Map
                </h2>
                <p className="text-xs text-slate-400">Real-time harbor radar with berths, fairway pilotage channels, and anchorage basin telemetry for {currentPortMeta?.name}</p>
              </div>
              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-400">PORT FOCAL:</span>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                  {currentPortMeta?.name} ({currentPortMeta?.id})
                </span>
              </div>
            </div>

            {/* Quick Port Switcher Strip */}
            <div className="glass-panel p-2 rounded-xl border border-ocean-700/60 flex items-center space-x-2 overflow-x-auto text-xs shadow-lg">
              <span className="text-slate-400 font-mono text-[11px] px-2 flex-shrink-0">SELECT PORT:</span>
              {ports.map((p) => {
                const isSelected = p.id === selectedPort;
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPort(p.id)}
                    className={`px-3 py-1.5 rounded-lg font-mono font-medium whitespace-nowrap transition-all flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-cyan-500 text-ocean-950 font-bold shadow-md shadow-cyan-500/20'
                        : 'bg-ocean-900/60 text-slate-300 border border-ocean-800 hover:border-ocean-700 hover:text-white'
                    }`}
                  >
                    <span>{p.name.split(' (')[0]}</span>
                    <span 
                      className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                        isSelected ? 'bg-ocean-950 text-cyan-300' : 'bg-ocean-800 text-slate-400'
                      }`}
                    >
                      {p.id}
                    </span>
                  </button>
                );
              })}
            </div>

            <PortMap
              ports={ports}
              selectedPort={selectedPort}
              onSelectPort={(pid) => setSelectedPort(pid)}
              portDetail={portDetail}
              allShipments={shipmentsData.shipments}
              initialScope="port"
              viewTitle={`GEOSPATIAL AIS HARBOR RADAR • ${currentPortMeta?.name}`}
            />
          </div>
        )}

        {/* View 4: AI Simulator */}
        {activeTab === 'simulator' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white font-mono flex items-center">
                <Activity className="w-5 h-5 text-amber-400 mr-2" />
                AI Congestion Predictor & What-If Stress Simulator
              </h2>
              <p className="text-xs text-slate-400">Adjust port capacity, anchorage queue, gale wind speeds, and labor parameters to test system resilience in real time</p>
            </div>
            <CongestionSimulator
              selectedPort={selectedPort}
              portDetail={portDetail}
              onTriggerExplanation={handleTriggerExplanation}
            />
          </div>
        )}

        {/* View 5: Shipments & Delays */}
        {activeTab === 'shipments' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white font-mono flex items-center">
                <Ship className="w-5 h-5 text-cyan-400 mr-2" />
                Global Shipment Tracking & Demurrage Risk Manager
              </h2>
              <p className="text-xs text-slate-400">Monitored high-value container and bulk shipments with AI-calculated delay hours and estimated supply chain financial impact</p>
            </div>
            <ShipmentTracker
              shipments={shipmentsData.shipments}
              summary={shipmentsData.summary}
              onSelectPort={(pid) => {
                setSelectedPort(pid);
                setActiveTab('map');
              }}
            />
          </div>
        )}

        {/* View 6: NVIDIA Nemotron AI Copilot */}
        {activeTab === 'copilot' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white font-mono flex items-center">
                <Cpu className="w-5 h-5 text-violet-400 mr-2" />
                NVIDIA Nemotron 3.5 Operational Reasoning Copilot
              </h2>
              <p className="text-xs text-slate-400">Natural-language root cause explanation, bottleneck diagnostic, and actionable maritime mitigations powered by Nemotron-3.5-Lightning-30B</p>
            </div>
            <NemotronCopilot
              selectedPort={selectedPort}
              currentPortData={portDetail}
              externalExplanation={externalExplanation}
            />
          </div>
        )}

        {/* View 7: Model Performance */}
        {activeTab === 'evaluation' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-white font-mono flex items-center">
                <Layers className="w-5 h-5 text-emerald-400 mr-2" />
                Model Evaluation & Theoretical Methodology Hub
              </h2>
              <p className="text-xs text-slate-400">Rigorous statistical evaluation including ROC-AUC, Confusion Matrix, Information Gain feature importances, and Delay MAE</p>
            </div>
            <ModelEvaluationHub metrics={metrics} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-ocean-800 bg-ocean-950 py-4 px-6 text-xs text-slate-500 font-mono flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <span>AIQON MARITIME AI PLATFORM</span>
          <span>•</span>
          <span>DATASET: NOAA MARINE CADASTRE 2026 (4.88M RECORDS)</span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          <span>BACKEND: FASTAPI + XGBOOST</span>
          <span>•</span>
          <span>LLM: NVIDIA NEMOTRON 3.5 LIGHTNING 30B</span>
          <span>•</span>
          <span>FRONTEND: REACT + THREE.JS</span>
        </div>
      </footer>
    </div>
  );
}

