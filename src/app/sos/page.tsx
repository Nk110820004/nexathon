'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/context/UserContext';
import { 
  AlertTriangle, 
  MapPin, 
  Phone, 
  ShieldAlert, 
  Loader2, 
  Volume2, 
  VolumeX, 
  X,
  Compass
} from 'lucide-react';
import Script from 'next/script';

// Gorgeous Dark Mode Styling config for Google Maps API
const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  {
    featureType: 'administrative.locality',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#cbd5e1' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#020617' }],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#1e293b' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#94a3b8' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#334155' }],
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry.stroke',
    stylers: [{ color: '#475569' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#020617' }],
  },
  {
    featureType: 'water',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#334155' }],
  },
];

export default function SOSCenter() {
  const { user } = useUser();
  const router = useRouter();

  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [clinics, setClinics] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [countdown, setCountdown] = useState(5);

  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioOscillatorRef = useRef<OscillatorNode | null>(null);
  const audioIntervalRef = useRef<any>(null);
  const countdownIntervalRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Request browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocating(false);
      },
      (error) => {
        console.error('Geolocation failed:', error);
        // Fallback default coordinates: VIT Campus or generic
        setLocation({ lat: 12.9716, lng: 79.1595 });
        setLocating(false);
      }
    );

    return () => {
      stopSirens();
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  // Fetch clinics and plot map when location is resolved and script loads
  useEffect(() => {
    if (!location || !mapLoaded || !mapRef.current) return;

    const initMap = async () => {
      try {
        const { google } = window as any;
        if (!google) return;

        // Initialize Google Map Instance
        const map = new google.maps.Map(mapRef.current, {
          center: location,
          zoom: 14,
          styles: darkMapStyles,
          disableDefaultUI: true,
          zoomControl: true,
        });
        googleMapInstanceRef.current = map;

        // Pin user location (Blue Dot)
        new google.maps.Marker({
          position: location,
          map,
          title: 'Your Location',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#06b6d4',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
          },
        });

        // Fetch Clinics through our secure proxy
        const res = await fetch(`/api/places?lat=${location.lat}&lng=${location.lng}`);
        if (res.ok) {
          const data = await res.json();
          const results = data.results || [];
          setClinics(results);

          // Plot clinic markers
          const infoWindow = new google.maps.InfoWindow();
          results.forEach((place: any) => {
            const marker = new google.maps.Marker({
              position: {
                lat: place.geometry.location.lat,
                lng: place.geometry.location.lng,
              },
              map,
              title: place.name,
              icon: {
                path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
                fillColor: '#f43f5e',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 1,
                scale: 1.5,
                anchor: new google.maps.Point(12, 24),
              },
            });

            marker.addListener('click', () => {
              infoWindow.setContent(`
                <div style="color: #0f172a; font-family: Inter, sans-serif; padding: 5px;">
                  <h4 style="margin: 0 0 5px 0; font-weight: bold; font-size: 13px;">${place.name}</h4>
                  <p style="margin: 0; font-size: 11px; color: #475569;">${place.vicinity}</p>
                </div>
              `);
              infoWindow.open(map, marker);
            });
          });
        }
      } catch (err) {
        console.error('Failed to initialize map content:', err);
      }
    };

    initMap();
  }, [location, mapLoaded]);

  // Audio sirens generator using Web Audio API
  const startSirens = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      
      audioOscillatorRef.current = osc;

      // Toggle frequencies to generate ambulance siren tone
      let high = false;
      audioIntervalRef.current = setInterval(() => {
        if (osc) {
          osc.frequency.setValueAtTime(high ? 960 : 770, ctx.currentTime);
          high = !high;
        }
      }, 500);
    } catch (e) {
      console.error('Siren generation failed:', e);
    }
  };

  const stopSirens = () => {
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current);
      audioIntervalRef.current = null;
    }
    if (audioOscillatorRef.current) {
      try {
        audioOscillatorRef.current.stop();
      } catch (e) {}
      audioOscillatorRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
  };

  // SOS button trigger
  const handleTriggerSOS = () => {
    setSosActive(true);
    setCountdown(5);
    startSirens();
    
    // Countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Cancel SOS
  const handleCancelSOS = () => {
    stopSirens();
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setSosActive(false);
  };

  const scriptUrl = 'https://maps.gomaps.pro/maps/api/js?key=AlzaSyPl0aYJ2eJUN9hFxXHdpzjFzNFQsljncqR&callback=initMapsCallback&libraries=places';

  // Attach callback hook to window before script loads
  useEffect(() => {
    (window as any).initMapsCallback = () => {
      setMapLoaded(true);
    };
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      {/* Load GoMaps JS SDK */}
      <Script src={scriptUrl} strategy="lazyOnload" />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight font-display flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-brand-red animate-pulse" />
            SOS Emergency Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">Locate nearby physical clinics and trigger paramedic assistance.</p>
        </div>

        {/* Audio Mute */}
        {sosActive && (
          <button
            onClick={() => {
              if (soundEnabled) {
                stopSirens();
              } else {
                startSirens();
              }
              setSoundEnabled(!soundEnabled);
            }}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition-colors z-50 relative"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-brand-red" /> : <VolumeX className="w-4 h-4" />}
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Map Viewport Container */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="relative w-full h-[500px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            
            {/* Google Map Div */}
            <div ref={mapRef} className="w-full h-full" />

            {/* Geolocation Loading overlay */}
            {locating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm gap-3">
                <Loader2 className="w-8 h-8 text-brand-red animate-spin" />
                <span className="text-slate-400 text-sm font-semibold">Detecting GPS Coordinates...</span>
              </div>
            )}
          </div>
        </div>

        {/* Paramedics trigger board panel */}
        <div className="space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6 border border-brand-red/20">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <AlertTriangle className="w-5 h-5 text-brand-red" />
              <h3 className="font-bold text-slate-200 text-sm">Emergency Trigger</h3>
            </div>

            <p className="text-xs text-slate-400 font-light leading-relaxed">
              If you feel sudden pain, pull a muscle, or feel dizzy during training, click below to page emergency services.
            </p>

            <button
              onClick={handleTriggerSOS}
              className="w-full py-4 rounded-xl bg-brand-red text-slate-950 font-black text-sm uppercase tracking-wider hover:bg-red-500 transition-all cursor-pointer shadow-[0_0_20px_rgba(244,63,94,0.3)] animate-pulse"
            >
              Trigger Ambulance
            </button>
          </div>

          {/* Location details card */}
          {location && (
            <div className="glass-panel rounded-2xl p-5 space-y-3">
              <h4 className="font-bold text-slate-300 text-xs flex items-center gap-1.5">
                <Compass className="w-4 h-4 text-brand-cyan" /> Current Location details
              </h4>
              <div className="text-xs font-mono space-y-1 bg-slate-900/60 p-3 rounded-lg border border-slate-800/50">
                <div className="flex justify-between">
                  <span className="text-slate-500">Latitude:</span>
                  <span className="text-slate-300 font-bold">{location.lat.toFixed(5)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Longitude:</span>
                  <span className="text-slate-300 font-bold">{location.lng.toFixed(5)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Near list summary */}
          <div className="glass-panel rounded-2xl p-5 text-xs text-slate-400 space-y-3 max-h-[170px] overflow-y-auto">
            <h4 className="font-bold text-slate-300 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-brand-emerald" /> Clinics Nearby ({clinics.length})
            </h4>
            {clinics.length === 0 ? (
              <p className="font-light">No clinics found within 5km.</p>
            ) : (
              <ul className="space-y-2">
                {clinics.slice(0, 4).map((c, i) => (
                  <li key={i} className="border-b border-slate-800/50 pb-1.5 last:border-0">
                    <span className="block font-semibold text-slate-300 truncate">{c.name}</span>
                    <span className="text-[10px] text-slate-500 truncate block">{c.vicinity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </div>

      {/* SOS Audio-Visual Full Screen Overlay */}
      {sosActive && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          
          {/* Siren ring circles */}
          <div className="relative w-44 h-44 flex items-center justify-center mb-8">
            <div className="absolute inset-0 rounded-full bg-brand-red/10 border border-brand-red/30 animate-ping" />
            <div className="absolute inset-4 rounded-full bg-brand-red/20 border border-brand-red/40 animate-[ping_2s_infinite]" />
            <div className="w-24 h-24 rounded-full bg-brand-red flex items-center justify-center shadow-[0_0_40px_rgba(244,63,94,0.6)] z-10">
              <Phone className="w-10 h-10 text-slate-950 animate-bounce" />
            </div>
          </div>

          <div className="space-y-4 max-w-md">
            <span className="text-xs font-bold uppercase tracking-widest text-brand-red animate-pulse">
              Emergency SOS Beacon Active
            </span>
            <h2 className="text-3xl font-black text-slate-100 tracking-tight">
              Calling Paramedics...
            </h2>
            
            {countdown > 0 ? (
              <p className="text-sm text-slate-400">
                Initiating connection in <span className="font-bold text-slate-200">{countdown}s</span>.
              </p>
            ) : (
              <p className="text-sm text-brand-emerald font-bold animate-pulse">
                Ambulance Simulating Dispatch! Coordinates sent.
              </p>
            )}

            {/* Readout coordinates card for Paramedics */}
            {location && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2 mt-6">
                <span className="text-slate-500 uppercase tracking-wider font-semibold block text-[10px]">Read this to Paramedics</span>
                <div className="font-mono text-slate-200 font-bold space-y-1 text-sm">
                  <p>My Location GPS:</p>
                  <p className="text-brand-cyan">{location.lat.toFixed(5)} N , {location.lng.toFixed(5)} E</p>
                </div>
              </div>
            )}

            <div className="pt-6">
              <button
                onClick={handleCancelSOS}
                className="px-8 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-rose-500 font-bold hover:bg-slate-800 transition-all flex items-center gap-2 mx-auto cursor-pointer text-xs"
              >
                <X className="w-4 h-4" /> Cancel Emergency Call
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
