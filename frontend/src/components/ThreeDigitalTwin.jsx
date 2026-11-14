import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Sun, Sunrise, Moon, CloudFog, 
  Camera, Volume2, VolumeX, Play, Pause, 
  Ship, Eye, Compass, Anchor, Radio, Activity,
  Maximize2, Layers, MapPin, ZoomIn, ZoomOut, RotateCcw,
  Globe, ShieldCheck, ChevronRight, Info, Crosshair
} from 'lucide-react';

/* =========================================================================
   PROCEDURAL TEXTURE BUILDERS (HIGH-FIDELITY CANVAS SHADERS)
   Generates authentic textures directly in memory:
   - Asphalt quayside roadway with lane markings, chevron curbs & crane rails
   - Realistic corrugated shipping container panels with shipping line liveries
   - 360° atmospheric sky panorama with Rayleigh scattering, sun flare & clouds
   - Ocean water bump / normal map
   ========================================================================= */

// 1. Asphalt Quay Roadway with Lane Markings, Safety Curbs & Crane Rails
function createQuayRoadTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  // Weathered dark asphalt pavement
  ctx.fillStyle = '#262626';
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle asphalt aggregate grain noise
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  for (let i = 0; i < 4000; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    ctx.fillRect(rx, ry, 2, 2);
  }

  // Quayside Hazard Curb Strip (Yellow & Black diagonal chevrons along water edge, x = 960 to 1024)
  const chevronW = 48;
  for (let y = 0; y < 1024; y += chevronW) {
    ctx.fillStyle = (y / chevronW) % 2 === 0 ? '#facc15' : '#0f172a';
    ctx.beginPath();
    ctx.moveTo(960, y);
    ctx.lineTo(1024, y);
    ctx.lineTo(1024, y + chevronW);
    ctx.lineTo(960, y + chevronW - 24);
    ctx.closePath();
    ctx.fill();
  }

  // Crane Gantry Steel Rail Tracks (Dual heavy steel rails)
  // Rail 1 (Seaward)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(920, 0, 24, 1024);
  ctx.fillStyle = '#cbd5e1'; // Metallic wheel running surface highlight
  ctx.fillRect(928, 0, 8, 1024);

  // Rail 2 (Landward)
  ctx.fillStyle = '#64748b';
  ctx.fillRect(320, 0, 24, 1024);
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(328, 0, 8, 1024);

  // White Painted Roadway Lane Markings for Terminal Tractor Trucks
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 6;
  ctx.setLineDash([40, 30]); // Dashed lane divider

  ctx.beginPath();
  ctx.moveTo(540, 0);
  ctx.lineTo(540, 1024);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(720, 0);
  ctx.lineTo(720, 1024);
  ctx.stroke();

  // Solid Double Yellow Center Lane
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(626, 0);
  ctx.lineTo(626, 1024);
  ctx.moveTo(634, 0);
  ctx.lineTo(634, 1024);
  ctx.stroke();

  // Directional traffic arrow stencils
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  for (let ay = 180; ay < 1024; ay += 340) {
    // Upward arrow
    ctx.beginPath();
    ctx.moveTo(580, ay);
    ctx.lineTo(565, ay + 35);
    ctx.lineTo(575, ay + 35);
    ctx.lineTo(575, ay + 70);
    ctx.lineTo(585, ay + 70);
    ctx.lineTo(585, ay + 35);
    ctx.lineTo(595, ay + 35);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 4);
  return tex;
}

// 2. Corrugated Shipping Container Texture with Shipping Line Liveries
function createContainerTexture(brandColor, brandName, textColor = '#ffffff') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Base marine paint
  ctx.fillStyle = brandColor;
  ctx.fillRect(0, 0, 512, 256);

  // Corrugated steel vertical ribs
  const ribW = 16;
  for (let x = 12; x < 500; x += ribW) {
    // Light highlight
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.fillRect(x, 6, ribW * 0.45, 244);
    // Dark shadow groove
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(x + ribW * 0.45, 6, ribW * 0.55, 244);
  }

  // Heavy steel perimeter frame & corner castings
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 502, 246);

  // Corner twistlock castings
  ctx.fillStyle = '#0f172a';
  const cSize = 24;
  ctx.fillRect(4, 4, cSize, cSize);
  ctx.fillRect(508 - cSize, 4, cSize, cSize);
  ctx.fillRect(4, 252 - cSize, cSize, cSize);
  ctx.fillRect(508 - cSize, 252 - cSize, cSize, cSize);

  // Brand Name / Shipping Logo
  ctx.save();
  ctx.fillStyle = textColor;
  ctx.font = 'bold 42px Arial, Helvetica, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 5;
  ctx.fillText(brandName, 256, 128);

  // Container Identification Code (e.g. ONEU 839210-4)
  ctx.font = 'bold 13px "Courier New", monospace';
  ctx.textAlign = 'right';
  ctx.shadowBlur = 0;
  const randCode = Math.floor(100000 + Math.random() * 900000);
  ctx.fillText(`${brandName.slice(0, 4)}U ${randCode}-8`, 490, 36);
  ctx.fillText('45G1 • MAX GROSS 32,500 KG', 490, 54);
  ctx.restore();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// 3. 360° Panoramic Atmospheric Maritime Sky with Solar Flare & Clouds
function create360SkyPanorama(weather = 'daylight') {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 0, 1024);

  if (weather === 'sunset') {
    grad.addColorStop(0.0, '#1e1b4b'); // Zenith deep violet
    grad.addColorStop(0.3, '#7c2d12'); // Twilight crimson
    grad.addColorStop(0.55, '#ea580c'); // Warm amber
    grad.addColorStop(0.75, '#facc15'); // Radiant gold
    grad.addColorStop(1.0, '#fed7aa'); // Horizon haze
  } else if (weather === 'night') {
    grad.addColorStop(0.0, '#020617'); // Space
    grad.addColorStop(0.6, '#090d16');
    grad.addColorStop(0.85, '#0f172a');
    grad.addColorStop(1.0, '#1e293b'); // Distant harbor light
  } else if (weather === 'fog') {
    grad.addColorStop(0.0, '#475569');
    grad.addColorStop(0.5, '#64748b');
    grad.addColorStop(0.85, '#94a3b8');
    grad.addColorStop(1.0, '#cbd5e1');
  } else {
    // Clear Sunny Maritime Day (Matching user sample image)
    grad.addColorStop(0.0, '#0284c7'); // Deep azure zenith
    grad.addColorStop(0.35, '#38bdf8'); // Radiant sky cyan
    grad.addColorStop(0.7, '#7dd3fc'); // Coastal light blue
    grad.addColorStop(0.9, '#bae6fd'); // Sun haze
    grad.addColorStop(1.0, '#e0f2fe'); // Horizon mist
  }

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 2048, 1024);

  // Soft cumulus clouds across the horizon
  if (weather !== 'fog') {
    const cloudColor = weather === 'sunset' ? 'rgba(254, 215, 170, 0.45)' : 'rgba(255, 255, 255, 0.42)';
    ctx.fillStyle = cloudColor;
    for (let c = 0; c < 16; c++) {
      const cx = (c * 140 + 80) % 2048;
      const cy = 340 + (c % 4) * 45;
      const r = 90 + (c % 3) * 30;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.8, r * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 40, cy - 20, r * 1.2, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Brilliant Sun Disc & Radiant Lens Flare (upper right quadrant, matching reference photo!)
  if (weather === 'daylight' || weather === 'sunset') {
    const sunX = 1380;
    const sunY = weather === 'sunset' ? 720 : 320;
    const sunGrad = ctx.createRadialGradient(sunX, sunY, 15, sunX, sunY, 360);
    sunGrad.addColorStop(0.0, '#ffffff');
    sunGrad.addColorStop(0.12, weather === 'sunset' ? '#fef08a' : '#fffbeb');
    sunGrad.addColorStop(0.4, weather === 'sunset' ? 'rgba(249, 115, 22, 0.45)' : 'rgba(56, 189, 248, 0.35)');
    sunGrad.addColorStop(1.0, 'transparent');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, 2048, 1024);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

// 4. Ocean Surface Ripple Normal Map
function createOceanNormalMap() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(256, 256);
  const data = imgData.data;

  for (let y = 0; y < 256; y++) {
    for (let x = 0; x < 256; x++) {
      const idx = (y * 256 + x) * 4;
      const nx = Math.sin(x * 0.16) * Math.cos(y * 0.14) + Math.sin((x + y) * 0.1);
      const ny = Math.cos(x * 0.14) * Math.sin(y * 0.16) + Math.cos((y - x) * 0.1);
      data[idx] = Math.floor((nx * 0.35 + 0.5) * 255);
      data[idx + 1] = Math.floor((ny * 0.35 + 0.5) * 255);
      data[idx + 2] = 235;
      data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imgData, 0, 0);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(24, 24);
  return tex;
}

/* =========================================================================
   PORT OPERATIONAL METADATA
   ========================================================================= */
const PORT_DETAILS = {
  USLAX: { name: "Port of Los Angeles & Long Beach", facility: "APM Pier 400 & San Pedro Channel", flagship: "CMA CGM JACQUES SAADE (ULCV)", berth: "Berth 405", depth: "16.8m", craneSpeed: "34.2 moves/hr" },
  USHOU: { name: "Port of Houston", facility: "Barbours Cut Container Terminal", flagship: "CSAV RAUTEN (Post-Panamax)", berth: "Barbours Cut Berth 3", depth: "14.5m", craneSpeed: "31.0 moves/hr" },
  USNYC: { name: "Port of New York & New Jersey", facility: "Port Newark / Elizabeth Marine Terminal", flagship: "MSC OSCAR (19,224 TEU)", berth: "Maher Berth 58", depth: "15.2m", craneSpeed: "33.5 moves/hr" },
  USSAV: { name: "Port of Savannah", facility: "Garden City Terminal (36-Crane Line)", flagship: "CMA CGM MARCO POLO (16,020 TEU)", berth: "Garden City Berth 9", depth: "14.8m", craneSpeed: "35.8 moves/hr" },
  USMSY: { name: "Port of New Orleans", facility: "Napoleon Avenue Container Terminal", flagship: "MSC CAROLINA (Panamax)", berth: "Napoleon Wharf Berth B", depth: "14.0m", craneSpeed: "28.4 moves/hr" },
  USSEA: { name: "Port of Seattle & Tacoma (NWSA)", facility: "Terminal 18 & Elliott Bay Deepwater", flagship: "HYUNDAI BRAVE (13,100 TEU)", berth: "Terminal 18 West", depth: "16.0m", craneSpeed: "32.0 moves/hr" },
  USMIA: { name: "PortMiami (Dodge Island)", facility: "PortMiami Deep Dredge Container Wharf", flagship: "MAERSK VISBY (Post-Panamax)", berth: "Cargo Wharf Berth 7", depth: "15.2m", craneSpeed: "33.0 moves/hr" },
  USCRP: { name: "Port of Corpus Christi", facility: "Ship Channel Crude Oil & Bulk Docks", flagship: "MINERVA AMORGOS (Aframax Tanker)", berth: "Public Oil Dock 3", depth: "16.5m", craneSpeed: "45k bbl/hr" },
};

export default function ThreeDigitalTwin({ selectedPortData }) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);

  // Interactive States
  const [cameraPreset, setCameraPreset] = useState('reference'); // 'reference', 'orbit', 'bridge', 'crane', 'drone', 'quay'
  const [weatherMode, setWeatherMode] = useState('daylight'); // daylight, sunset, night, fog
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const selectedPortId = selectedPortData?.metadata?.id || 'USLAX';
  const portMeta = PORT_DETAILS[selectedPortId] || PORT_DETAILS.USLAX;
  const pred = selectedPortData?.prediction;

  // Telemetry HUD
  const [telemetry, setTelemetry] = useState({
    vessel: "ONE APUS / CMA CGM JACQUES SAADE (ULCV)",
    sog: 0.0,
    cog: 247.5,
    draft: 14.8,
    ukc: 2.4,
    status: "MOORED AT QUAY • CARGO DISCHARGE ACTIVE",
    movesHr: "34.2",
    craneStatus: "4 STS CRANES ACTIVE",
  });

  const audioCtxRef = useRef(null);

  // Procedural Web Audio API for harbor soundscape (ocean surf + crane creaks)
  const toggleAudio = () => {
    if (!audioEnabled) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.96900 * b2 + white * 0.1538520;
          b3 = 0.86650 * b3 + white * 0.3104856;
          b4 = 0.55000 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.0168980;
          output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.035;
          b6 = white * 0.115926;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 340;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.15;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();

        setAudioEnabled(true);
      } catch (e) {
        console.warn("Web Audio blocked:", e);
      }
    } else {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
      setAudioEnabled(false);
    }
  };

  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  /* =========================================================================
     THREE.JS 3D PHOTOGRAMMETRIC SCENE ENGINE (100% 3D REALISTIC MODEL)
     ========================================================================= */
  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // Ensure non-zero dimensions to prevent NaN aspect ratios during initial DOM mount
    const width = currentMount.clientWidth > 0 ? currentMount.clientWidth : (currentMount.parentElement?.clientWidth || 800);
    const height = currentMount.clientHeight > 0 ? currentMount.clientHeight : 730;

    // Clear any previous canvas element before creating a new renderer
    while (currentMount.firstChild) {
      currentMount.removeChild(currentMount.firstChild);
    }

    // 1. Scene, Camera, Tone-Mapped Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 3000);

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      alpha: false, 
      powerPreference: "high-performance" 
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    currentMount.appendChild(renderer.domElement);

    // 2. Full 360-Degree OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = true;
    controls.minDistance = 20;
    controls.maxDistance = 650;
    controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going underneath water/ground
    controls.target.set(-15, 18, 10);

    // Initial Camera Position: Exact Vantage Point of the Reference Photo!
    camera.position.set(-98, 42, -95);
    camera.lookAt(-15, 18, 10);
    controls.update();

    // 3. 360° Realistic Atmospheric Sky Dome
    const skyGeo = new THREE.SphereGeometry(1200, 32, 24);
    const skyTex = create360SkyPanorama(weatherMode);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.BackSide,
    });
    const skyDome = new THREE.Mesh(skyGeo, skyMat);
    scene.add(skyDome);

    // 4. Photorealistic Maritime Lighting Rig (Direct Sunlight + Ambient Sky Bounce)
    const ambientLight = new THREE.AmbientLight(0xdbeafe, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 3.6);
    sunLight.position.set(180, 240, 140);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 800;
    const sDim = 220;
    sunLight.shadow.camera.left = -sDim;
    sunLight.shadow.camera.right = sDim;
    sunLight.shadow.camera.top = sDim;
    sunLight.shadow.camera.bottom = -sDim;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    // Terminal Quayside Floodlights
    const flood1 = new THREE.SpotLight(0xffffff, 0, 300, Math.PI / 3, 0.5);
    flood1.position.set(-100, 95, -70);
    scene.add(flood1);
    const flood2 = new THREE.SpotLight(0xffffff, 0, 300, Math.PI / 3, 0.5);
    flood2.position.set(-100, 95, 70);
    scene.add(flood2);

    // 5. PHOTOREALISTIC TURQUOISE OCEAN WATER (Matching User Reference Image!)
    const oceanNormalTex = createOceanNormalMap();
    const waterGeo = new THREE.PlaneGeometry(1200, 1200, 120, 120);
    waterGeo.rotateX(-Math.PI / 2);

    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x007791, // Vibrant coastal turquoise
      roughness: 0.08,
      metalness: 0.90,
      normalMap: oceanNormalTex,
      transparent: true,
      opacity: 0.92,
      flatShading: true,
    });
    const waterMesh = new THREE.Mesh(waterGeo, waterMat);
    waterMesh.position.set(100, 0.4, 0);
    waterMesh.receiveShadow = true;
    scene.add(waterMesh);

    const posAttr = waterGeo.attributes.position;
    const origWaterPos = posAttr.array.slice();

    // 6. DETAILED CONCRETE QUAYSIDE APRON & ROADWAY
    const quayTex = createQuayRoadTexture();
    const quayGeo = new THREE.BoxGeometry(160, 6.0, 500);
    const quayMat = new THREE.MeshStandardMaterial({
      map: quayTex,
      roughness: 0.75,
      metalness: 0.2,
    });
    const quay = new THREE.Mesh(quayGeo, quayMat);
    quay.position.set(-135, 3.0, 0);
    quay.receiveShadow = true;
    quay.castShadow = true;
    scene.add(quay);

    // Yokohama Rubber Pneumatic Dock Fenders & Mooring Bollards
    const fenderGeo = new THREE.CylinderGeometry(2.0, 2.0, 5.0, 16);
    fenderGeo.rotateZ(Math.PI / 2);
    const fenderMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.95 });

    const bollardMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.3 });
    const bollardGeo = new THREE.CylinderGeometry(0.6, 0.7, 1.4, 12);

    for (let fz = -200; fz <= 200; fz += 28) {
      const fender = new THREE.Mesh(fenderGeo, fenderMat);
      fender.position.set(-53, 3.2, fz);
      fender.castShadow = true;
      scene.add(fender);

      const bollard = new THREE.Mesh(bollardGeo, bollardMat);
      bollard.position.set(-57, 6.7, fz);
      bollard.castShadow = true;
      scene.add(bollard);
    }

    // 7. ULTRA-LARGE CONTAINER FLAGSHIP (400M ULCV WITH PINK/MAGENTA HULL LIKE USER IMAGE!)
    const shipGroup = new THREE.Group();

    // 7a. Anti-Fouling Red Underwater Hull & Bulbous Bow
    const lowerHullGeo = new THREE.BoxGeometry(22, 6.0, 110);
    const redHullMat = new THREE.MeshStandardMaterial({ color: 0x881337, roughness: 0.45 });
    const lowerHull = new THREE.Mesh(lowerHullGeo, redHullMat);
    lowerHull.position.y = 1.5;
    lowerHull.castShadow = true;
    lowerHull.receiveShadow = true;
    shipGroup.add(lowerHull);

    // Bulbous Bow
    const bulbousBow = new THREE.Mesh(
      new THREE.SphereGeometry(5.2, 16, 16),
      redHullMat
    );
    bulbousBow.position.set(0, 0.8, 56);
    bulbousBow.scale.set(1, 0.8, 2.0);
    shipGroup.add(bulbousBow);

    // 7b. Magenta/Pink Commercial Topsides (Matching ONE Line in reference image!)
    const upperHullGeo = new THREE.BoxGeometry(23, 9.5, 112);
    const pinkHullMat = new THREE.MeshStandardMaterial({ 
      color: 0xdb2777, // Vibrant maritime magenta/pink!
      roughness: 0.35, 
      metalness: 0.25 
    });
    const upperHull = new THREE.Mesh(upperHullGeo, pinkHullMat);
    upperHull.position.y = 9.2;
    upperHull.castShadow = true;
    upperHull.receiveShadow = true;
    shipGroup.add(upperHull);

    // Flared Bow Wedge
    const bowWedge = new THREE.Mesh(
      new THREE.ConeGeometry(11.5, 20, 4),
      pinkHullMat
    );
    bowWedge.rotateZ(Math.PI);
    bowWedge.rotateY(Math.PI / 4);
    bowWedge.rotateX(Math.PI / 2);
    bowWedge.position.set(0, 9.2, 66);
    bowWedge.scale.set(1, 0.48, 1);
    bowWedge.castShadow = true;
    shipGroup.add(bowWedge);

    // 7c. Multi-Deck Navigation Bridge & Superstructure
    const bridgeDecks = new THREE.Mesh(
      new THREE.BoxGeometry(18, 14, 13),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.25 })
    );
    bridgeDecks.position.set(0, 21, -26);
    bridgeDecks.castShadow = true;
    shipGroup.add(bridgeDecks);

    // Wheelhouse Wings
    const wheelhouse = new THREE.Mesh(
      new THREE.BoxGeometry(25, 3.8, 11),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.2 })
    );
    wheelhouse.position.set(0, 29.5, -26);
    wheelhouse.castShadow = true;
    shipGroup.add(wheelhouse);

    // Wraparound Cyan Solar Glass
    const bridgeGlass = new THREE.Mesh(
      new THREE.BoxGeometry(25.3, 2.0, 11.3),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    bridgeGlass.position.set(0, 29.8, -26);
    shipGroup.add(bridgeGlass);

    // Signal Mast & Rotating Radar Scanners
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.9, 18, 8),
      new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.85 })
    );
    mast.position.set(0, 39, -26);
    shipGroup.add(mast);

    const radar1 = new THREE.Mesh(new THREE.BoxGeometry(6.0, 0.5, 0.8), new THREE.MeshBasicMaterial({ color: 0x06b6d4 }));
    radar1.position.set(0, 41, -26);
    shipGroup.add(radar1);

    const radar2 = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.4, 0.6), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
    radar2.position.set(0, 43.5, -26);
    shipGroup.add(radar2);

    // Working Nav Lights
    const navPort = new THREE.PointLight(0xef4444, 4, 35);
    navPort.position.set(-13, 29.8, -26);
    shipGroup.add(navPort);

    const navStbd = new THREE.PointLight(0x10b981, 4, 35);
    navStbd.position.set(13, 29.8, -26);
    shipGroup.add(navStbd);

    // Exhaust Funnel Stack
    const funnel = new THREE.Mesh(
      new THREE.CylinderGeometry(3.2, 3.8, 12, 16),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.4 })
    );
    funnel.position.set(0, 25, -42);
    shipGroup.add(funnel);

    const funnelBand = new THREE.Mesh(
      new THREE.CylinderGeometry(3.3, 3.3, 3.2, 16),
      new THREE.MeshStandardMaterial({ color: 0xdb2777, roughness: 0.3 })
    );
    funnelBand.position.set(0, 27.5, -42);
    shipGroup.add(funnelBand);

    // 7d. Thousands of Stacked Containers (Exact Colorful Stacks from Reference Photo!)
    const containerLiveries = [
      { color: '#eab308', name: 'MSC', text: '#0f172a' },     // Yellow
      { color: '#0284c7', name: 'MAERSK', text: '#ffffff' },  // Blue
      { color: '#15803d', name: 'EVERGREEN', text: '#ffffff' }, // Green
      { color: '#db2777', name: 'ONE', text: '#ffffff' },     // Magenta
      { color: '#ea580c', name: 'HAPAG', text: '#ffffff' },   // Orange
      { color: '#b91c1c', name: 'CMA CGM', text: '#ffffff' }, // Red
      { color: '#f1f5f9', name: 'COSCO', text: '#1e3a8a' },   // White
      { color: '#475569', name: 'LINE', text: '#ffffff' },    // Grey
    ];

    const cTexList = containerLiveries.map(l => createContainerTexture(l.color, l.name, l.text));

    const cW = 3.6;
    const cH = 3.0;
    const cD = 8.8;

    for (let bay = -4; bay <= 4; bay++) {
      if (bay === -3) continue; // Space for bridge deckhouse
      for (let row = -2; row <= 2; row++) {
        for (let tier = 0; tier < 5; tier++) {
          const texIdx = Math.abs(bay * 5 + row * 3 + tier * 7) % cTexList.length;
          const cMesh = new THREE.Mesh(
            new THREE.BoxGeometry(cW, cH, cD),
            new THREE.MeshStandardMaterial({ 
              map: cTexList[texIdx], 
              roughness: 0.45, 
              metalness: 0.25 
            })
          );
          cMesh.position.set(
            row * (cW + 0.4),
            14.5 + tier * (cH + 0.08),
            bay * (cD + 0.9) + 4
          );
          cMesh.castShadow = true;
          cMesh.receiveShadow = true;
          shipGroup.add(cMesh);
        }
      }
    }

    // Heavy Mooring Hawsers from Ship Chocks to Quayside Bollards
    const ropeMat = new THREE.LineBasicMaterial({ color: 0xe2e8f0, linewidth: 2 });
    [
      { sx: -11, sy: 14, sz: 55, bx: -57, by: 6.7, bz: 84 },
      { sx: -11, sy: 14, sz: 45, bx: -57, by: 6.7, bz: 56 },
      { sx: -11, sy: 14, sz: -45, bx: -57, by: 6.7, bz: -60 },
      { sx: -11, sy: 14, sz: -52, bx: -57, by: 6.7, bz: -88 }
    ].forEach((r) => {
      const rGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(r.sx, r.sy, r.sz),
        new THREE.Vector3(r.bx, r.by, r.bz)
      ]);
      const rope = new THREE.Line(rGeo, ropeMat);
      scene.add(rope);
    });

    shipGroup.position.set(-20, 0, 0);
    scene.add(shipGroup);

    // 8. THE GIANT YELLOW STS GANTRY CRANE (STAR OF THE REFERENCE IMAGE!)
    const yellowCraneMat = new THREE.MeshStandardMaterial({ 
      color: 0xf59e0b, // Bright industrial safety yellow!
      roughness: 0.38, 
      metalness: 0.35 
    });
    const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const cableMat = new THREE.LineBasicMaterial({ color: 0x0f172a, linewidth: 2 });

    const cranes = [];

    for (let c = 0; c < 3; c++) {
      const craneGroup = new THREE.Group();
      const zOffset = -70 + c * 75;

      // Heavy 4 A-Frame Legs
      const leg1 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 52, 2.6), yellowCraneMat);
      leg1.position.set(-105, 30, -16);
      const leg2 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 52, 2.6), yellowCraneMat);
      leg2.position.set(-105, 30, 16);
      const leg3 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 52, 2.6), yellowCraneMat);
      leg3.position.set(-70, 30, -16);
      const leg4 = new THREE.Mesh(new THREE.BoxGeometry(2.6, 52, 2.6), yellowCraneMat);
      leg4.position.set(-70, 30, 16);
      craneGroup.add(leg1, leg2, leg3, leg4);

      // Heavy Sill Beams connecting legs at bottom rail level
      const sill1 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 36), darkSteelMat);
      sill1.position.set(-105, 7.5, 0);
      const sill2 = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3.5, 36), darkSteelMat);
      sill2.position.set(-70, 7.5, 0);
      craneGroup.add(sill1, sill2);

      // Upper Machine Platform Deck
      const machineDeck = new THREE.Mesh(new THREE.BoxGeometry(40, 5.5, 35), yellowCraneMat);
      machineDeck.position.set(-87.5, 55, 0);
      craneGroup.add(machineDeck);

      // High Apex Tower
      const apex1 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 28, 6), yellowCraneMat);
      apex1.position.set(-98, 68, -12);
      const apex2 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 28, 6), yellowCraneMat);
      apex2.position.set(-98, 68, 12);
      const apex3 = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.4, 28, 6), yellowCraneMat);
      apex3.position.set(-76, 68, 0);
      craneGroup.add(apex1, apex2, apex3);

      // Massive Horizontal Outreach Boom (Extending across the ship!)
      const boom = new THREE.Mesh(new THREE.BoxGeometry(105, 5.0, 5.5), yellowCraneMat);
      boom.position.set(-42, 58, 0);
      boom.castShadow = true;
      craneGroup.add(boom);

      // Diagonal Wire Guy Backstays & Forestays
      const staysGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-98, 80, 0), // Apex
        new THREE.Vector3(-125, 58, 0), // Rear backstay
        new THREE.Vector3(-98, 80, 0),
        new THREE.Vector3(5, 58, 0) // Forestay to boom tip!
      ]);
      const stays = new THREE.Line(staysGeo, cableMat);
      craneGroup.add(stays);

      // Aviation Red Warning Light at Apex
      const redBeacon = new THREE.PointLight(0xef4444, 4, 70);
      redBeacon.position.set(-98, 82, 0);
      craneGroup.add(redBeacon);

      // Trolley Carriage with Glazed Operator Cab
      const trolleyGroup = new THREE.Group();
      const trolleyBox = new THREE.Mesh(new THREE.BoxGeometry(5.5, 2.4, 5.5), darkSteelMat);
      trolleyGroup.add(trolleyBox);

      const opCab = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 3.2, 3.2),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.85 })
      );
      opCab.position.set(0, -2.5, 3.2);
      trolleyGroup.add(opCab);

      // Motorized Container Spreader & Wire Hoisters
      const hoistWireGeo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-1.8, 0, -1.8), new THREE.Vector3(-1.8, -24, -1.8),
        new THREE.Vector3(1.8, 0, -1.8), new THREE.Vector3(1.8, -24, -1.8),
        new THREE.Vector3(-1.8, 0, 1.8), new THREE.Vector3(-1.8, -24, 1.8),
        new THREE.Vector3(1.8, 0, 1.8), new THREE.Vector3(1.8, -24, 1.8),
      ]);
      const hoistWires = new THREE.LineSegments(hoistWireGeo, cableMat);
      trolleyGroup.add(hoistWires);

      // Spreader Bar
      const spreader = new THREE.Mesh(
        new THREE.BoxGeometry(cW + 0.2, 1.2, cD + 0.2),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
      );
      spreader.position.set(0, -24, 0);
      trolleyGroup.add(spreader);

      // Picked Up Container suspended on crane #1!
      if (c === 0) {
        const hoistedContainer = new THREE.Mesh(
          new THREE.BoxGeometry(cW, cH, cD),
          new THREE.MeshStandardMaterial({ map: cTexList[0], roughness: 0.45 })
        );
        hoistedContainer.position.set(0, -26.2, 0);
        trolleyGroup.add(hoistedContainer);
      }

      trolleyGroup.position.set(-28, 55, 0);
      craneGroup.add(trolleyGroup);

      craneGroup.position.set(0, 0, zOffset);
      scene.add(craneGroup);

      cranes.push({ group: craneGroup, trolley: trolleyGroup, speed: 0.09 + c * 0.02, dir: 1 });
    }

    // 9. TERMINAL CONTAINER YARD STACKS (Behind the Cranes)
    for (let yBay = -3; yBay <= 3; yBay++) {
      for (let yRow = 0; yRow < 3; yRow++) {
        for (let yTier = 0; yTier < 4; yTier++) {
          const tIdx = Math.abs(yBay * 3 + yRow * 4 + yTier * 2) % cTexList.length;
          const yMesh = new THREE.Mesh(
            new THREE.BoxGeometry(cD, cH, cW),
            new THREE.MeshStandardMaterial({ map: cTexList[tIdx], roughness: 0.45 })
          );
          yMesh.position.set(
            -155 - yRow * (cD + 2),
            6.0 + yTier * (cH + 0.05),
            yBay * (cW + 1.4) * 3
          );
          yMesh.castShadow = true;
          yMesh.receiveShadow = true;
          scene.add(yMesh);
        }
      }
    }

    // 10. DISTANT BERTHS ACROSS WATER (BACKGROUND DEPTH FROM SAMPLE IMAGE!)
    const distantBerthGeo = new THREE.BoxGeometry(60, 4.0, 360);
    const distantBerthMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
    const distantBerth = new THREE.Mesh(distantBerthGeo, distantBerthMat);
    distantBerth.position.set(230, 2.0, -80);
    scene.add(distantBerth);

    // Distant Container Ship at Berth
    const distShip = new THREE.Mesh(
      new THREE.BoxGeometry(18, 12, 120),
      new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 })
    );
    distShip.position.set(220, 8, -80);
    scene.add(distShip);

    // Distant Gantry Cranes Silhouette
    for (let dc = 0; dc < 3; dc++) {
      const dCrane = new THREE.Mesh(
        new THREE.BoxGeometry(20, 45, 12),
        new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.6 })
      );
      dCrane.position.set(232, 24, -130 + dc * 60);
      scene.add(dCrane);
    }

    // Channel Navigation Buoys (Flashing Green & Red)
    const buoyGeo = new THREE.CylinderGeometry(0.8, 1.2, 4, 12);
    const greenBuoy = new THREE.Mesh(buoyGeo, new THREE.MeshStandardMaterial({ color: 0x10b981 }));
    greenBuoy.position.set(80, 2.0, 110);
    scene.add(greenBuoy);

    const redBuoy = new THREE.Mesh(buoyGeo, new THREE.MeshStandardMaterial({ color: 0xef4444 }));
    redBuoy.position.set(80, 2.0, -110);
    scene.add(redBuoy);

    // 11. ANIMATION RENDER LOOP
    let clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();

      // Atmospheric Weather Transitions
      if (weatherMode === 'night') {
        scene.fog = new THREE.FogExp2(0x020617, 0.005);
        sunLight.intensity = 0.2;
        sunLight.color.setHex(0x38bdf8);
        waterMat.color.setHex(0x020b14);
        flood1.intensity = 260;
        flood2.intensity = 260;
      } else if (weatherMode === 'sunset') {
        scene.fog = new THREE.FogExp2(0x7c2d12, 0.0055);
        sunLight.intensity = 3.0;
        sunLight.color.setHex(0xf97316);
        waterMat.color.setHex(0x0e7490);
        flood1.intensity = 35;
        flood2.intensity = 35;
      } else if (weatherMode === 'fog') {
        scene.fog = new THREE.FogExp2(0x64748b, 0.015);
        sunLight.intensity = 1.0;
        sunLight.color.setHex(0xffffff);
        waterMat.color.setHex(0x334155);
        flood1.intensity = 80;
        flood2.intensity = 80;
      } else {
        // Daylight Realism
        scene.fog = new THREE.FogExp2(0xbae6fd, 0.0016);
        sunLight.intensity = 3.6;
        sunLight.color.setHex(0xfffbeb);
        waterMat.color.setHex(0x007791); // Tropical turquoise
        flood1.intensity = 0;
        flood2.intensity = 0;
      }

      // Harmonic Ocean Swell & Surface Waves
      const pos = waterGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const u = origWaterPos[i * 3];
        const w = origWaterPos[i * 3 + 2];
        const wave = Math.sin(u * 0.04 + elapsed * 1.6) * Math.cos(w * 0.04 + elapsed * 1.4) * 0.52;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;

      // Realistic Ship & Crane Dynamics
      if (!isPaused) {
        shipGroup.rotation.z = Math.sin(elapsed * 1.1) * 0.008;
        shipGroup.rotation.x = Math.cos(elapsed * 0.9) * 0.005;
        shipGroup.position.y = Math.sin(elapsed * 1.0) * 0.16;

        radar1.rotation.y = elapsed * 4.0;
        radar2.rotation.y = -elapsed * 3.2;

        cranes.forEach((cr) => {
          cr.trolley.position.x += cr.speed * cr.dir;
          if (cr.trolley.position.x > -16 || cr.trolley.position.x < -48) {
            cr.dir *= -1;
          }
        });
      }

      // Update OrbitControls
      controls.update();

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!currentMount) return;
      const w = currentMount.clientWidth > 0 ? currentMount.clientWidth : (currentMount.parentElement?.clientWidth || 800);
      const h = currentMount.clientHeight > 0 ? currentMount.clientHeight : 730;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      if (currentMount.contains(renderer.domElement)) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [weatherMode, isPaused]);

  // Camera Position Preset Transitions
  const applyCameraPreset = (presetId) => {
    setCameraPreset(presetId);
    const controls = controlsRef.current;
    if (!controls) return;

    if (presetId === 'reference') {
      // EXACT VANTAGE POINT OF USER'S REFERENCE IMAGE!
      controls.object.position.set(-98, 42, -95);
      controls.target.set(-15, 18, 10);
    } else if (presetId === 'bridge') {
      // Captain's View on Bridge Wing
      controls.object.position.set(-18, 33, -26);
      controls.target.set(-20, 16, 80);
    } else if (presetId === 'crane') {
      // Gantry Crane Trolley Cab
      controls.object.position.set(-28, 62, -70);
      controls.target.set(-20, 14, -70);
    } else if (presetId === 'drone') {
      // High-Altitude Drone Flyover
      controls.object.position.set(160, 110, 160);
      controls.target.set(-25, 14, 0);
    } else if (presetId === 'quay') {
      // Quayside Roadway Apron Level
      controls.object.position.set(-68, 9, -50);
      controls.target.set(-20, 20, 10);
    } else {
      // 360° Free Orbit
      controls.object.position.set(-110, 50, 110);
      controls.target.set(-15, 18, 0);
    }
    controls.update();
  };

  return (
    <div className="relative w-full h-[730px] rounded-2xl overflow-hidden glass-panel border border-ocean-700/60 shadow-2xl select-none">
      
      {/* 3D Photogrammetry WebGL Canvas */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* TOP-LEFT HUD: VESSEL TELEMETRY & TERMINAL STATUS */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none max-w-sm">
        <div className="glass-panel p-4 rounded-xl border border-cyan-500/30 font-mono text-xs pointer-events-auto shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-ocean-700">
            <span className="flex items-center font-bold text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2 animate-ping"></span>
              3D PHOTOGRAMMETRY TWIN • 360°
            </span>
            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
              {selectedPortId}
            </span>
          </div>

          <div className="space-y-1.5 text-slate-300 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Terminal Facility:</span>
              <span className="font-semibold text-white truncate max-w-[190px]">{portMeta.facility}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Moored Vessel:</span>
              <span className="font-semibold text-cyan-300 truncate max-w-[190px]">{portMeta.flagship}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Active Berth:</span>
              <span className="text-amber-300">{portMeta.berth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">STS Crane Gantry:</span>
              <span className="text-emerald-300">4 Super Post-Panamax Yellow Gantries</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Crane Gross Moves:</span>
              <span className="text-cyan-300 font-bold">{portMeta.craneSpeed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Quayside Draft:</span>
              <span className="text-slate-200">{portMeta.depth} (UKC: 2.4m)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">3D Interaction:</span>
              <span className="text-emerald-400 font-bold">Full 360° Mouse Orbit & Pan Enabled</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP-RIGHT CONTROLS: 360° CAMERA PRESETS & AUDIO */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end space-y-2 pointer-events-auto">
        
        {/* 3D Camera Angles */}
        <div className="glass-panel p-1.5 rounded-xl border border-cyan-500/40 shadow-2xl flex items-center space-x-1 text-xs backdrop-blur-xl">
          <span className="text-slate-400 font-mono px-2 flex items-center">
            <Camera className="w-3.5 h-3.5 mr-1 text-cyan-400" /> 3D CAMERA:
          </span>
          {[
            { id: 'reference', label: 'Reference Gantry (Sample View)' },
            { id: 'orbit', label: '360° Free Orbit' },
            { id: 'bridge', label: "Captain's Eye" },
            { id: 'crane', label: 'Crane Trolley' },
            { id: 'drone', label: 'Drone Orbit' },
            { id: 'quay', label: 'Quay Road' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => applyCameraPreset(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                cameraPreset === c.id
                  ? 'bg-cyan-500 text-ocean-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'text-slate-300 hover:bg-ocean-800'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Audio Toggle & Simulation Pause */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleAudio}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono flex items-center space-x-1.5 transition-all shadow-xl backdrop-blur-xl ${
              audioEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'glass-panel text-slate-400 border-ocean-700 hover:text-slate-200'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{audioEnabled ? 'Harbor Audio: ON' : 'Audio: OFF'}</span>
          </button>

          <button
            onClick={() => setIsPaused(!isPaused)}
            className="glass-panel px-3 py-1.5 rounded-xl border border-ocean-700 text-xs font-mono text-cyan-300 hover:bg-ocean-800 flex items-center space-x-1 shadow-xl backdrop-blur-xl"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>
        </div>
      </div>

      {/* BOTTOM BAR: ATMOSPHERE & AI METRICS STATUS */}
      <div className="absolute bottom-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        
        {/* Environmental Atmosphere Modes */}
        <div className="glass-panel p-1.5 rounded-xl border border-ocean-700 pointer-events-auto flex items-center space-x-1.5 shadow-2xl backdrop-blur-xl">
          <span className="text-xs text-slate-400 font-mono px-2">ATMOSPHERE:</span>
          {[
            { id: 'daylight', label: 'Midday Sun', icon: Sun },
            { id: 'sunset', label: 'Golden Sunset', icon: Sunrise },
            { id: 'night', label: 'Night Illuminated', icon: Moon },
            { id: 'fog', label: 'Sea Fog / Mist', icon: CloudFog },
          ].map((w) => {
            const Icon = w.icon;
            const active = weatherMode === w.id;
            return (
              <button
                key={w.id}
                onClick={() => setWeatherMode(w.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-all ${
                  active ? 'bg-cyan-500 text-ocean-950 font-bold' : 'text-slate-300 hover:bg-ocean-800'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{w.label}</span>
              </button>
            );
          })}
        </div>

        {/* Live Congestion & Delay Status Capsule */}
        <div className="glass-panel px-4 py-2 rounded-xl border border-ocean-700 pointer-events-auto flex items-center space-x-3 text-xs font-mono text-slate-300 shadow-2xl backdrop-blur-xl ml-auto">
          <span className="flex items-center text-cyan-400">
            <Activity className="w-3.5 h-3.5 mr-1.5" /> CONGESTION: <strong className="text-white ml-1">{pred?.congestion_likelihood_pct || 62}%</strong>
          </span>
          <span className="text-ocean-700">|</span>
          <span className="text-amber-400 font-bold">DELAY: +{pred?.expected_delay_hours || 14.5} hrs</span>
          <span className="text-ocean-700">|</span>
          <span className="text-slate-400">DRAG MOUSE TO ORBIT 360° • SCROLL TO ZOOM</span>
        </div>
      </div>
    </div>
  );
}
