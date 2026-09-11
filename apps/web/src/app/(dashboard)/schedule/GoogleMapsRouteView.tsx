'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { ExternalLink, Navigation, Key, AlertCircle, CheckCircle2, ChevronRight, MapPin } from 'lucide-react';
export interface RouteScheduledJob {
  id: string;
  jobNumber?: string;
  customer?: string;
  jobType?: string;
  startTime?: string;
  addressStreet?: string;
  addressCityStateZip?: string;
  [key: string]: any;
}

export interface RouteTechUser {
  id: string;
  name: string;
  avatarColor?: string;
  scheduledJobs?: RouteScheduledJob[];
  [key: string]: any;
}

interface GoogleMapsRouteViewProps {
  techUsers: RouteTechUser[];
  selectedTechNames: string[];
  selectedDate: Date;
}

interface TechRouteData {
  techId: string;
  techName: string;
  colorHex: string;
  stops: Array<{
    stopNumber: number;
    jobId: string;
    jobNumber: string;
    customer: string;
    jobType: string;
    startTime: string;
    address: string;
  }>;
}

export default function GoogleMapsRouteView({
  techUsers,
  selectedTechNames,
  selectedDate,
}: GoogleMapsRouteViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('FSM_GOOGLE_MAPS_KEY');
      if (stored) return stored;
    }
    return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  });
  const [inputKey, setInputKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [selectedTechId, setSelectedTechId] = useState<string>('all');
  const [routeSummary, setRouteSummary] = useState<{
    distance?: string;
    duration?: string;
    techName?: string;
  } | null>(null);

  // Compile routes data per technician from their real scheduled jobs
  const techRoutes: TechRouteData[] = useMemo(() => {
    const activeTechs = techUsers.filter((t) => selectedTechNames.includes(t.name));
    const result: TechRouteData[] = [];

    for (const tech of activeTechs) {
      const sortedJobs = [...(tech.scheduledJobs || [])].sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '')
      );

      const stops = sortedJobs.map((job, idx) => {
        const fullAddr = `${job.addressStreet || ''}, ${job.addressCityStateZip || ''}`.replace(/^, /, '').trim() || 'Fort Walton Beach, FL';
        return {
          stopNumber: idx + 1,
          jobId: job.id,
          jobNumber: job.jobNumber || job.id.replace(/^appt-/, ''),
          customer: job.customer || 'Customer',
          jobType: job.jobType || 'Service',
          startTime: job.startTime || '8:00 AM',
          address: fullAddr,
        };
      });

      if (stops.length > 0) {
        result.push({
          techId: tech.id,
          techName: tech.name,
          colorHex: tech.avatarColor?.replace('bg-', '') || '#be4646',
          stops,
        });
      }
    }

    return result;
  }, [techUsers, selectedTechNames]);

  const activeRoutes = useMemo(() => {
    if (selectedTechId === 'all') return techRoutes;
    return techRoutes.filter((r) => r.techId === selectedTechId);
  }, [techRoutes, selectedTechId]);

  // Load Google Maps JavaScript API and render native Directions
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let isCancelled = false;

    async function initGoogleMaps() {
      try {
        setRouteError(null);

        // Dynamically load Google Maps script if not loaded
        if (!(window as any).google?.maps) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.getElementById('gmp-script');
            if (existing) {
              existing.addEventListener('load', () => resolve());
              existing.addEventListener('error', (e) => reject(e));
              return;
            }
            const script = document.createElement('script');
            script.id = 'gmp-script';
            script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=routes,geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps script. Check your API key.'));
            document.head.appendChild(script);
          });
        }

        if (isCancelled || !mapRef.current) return;
        const google = (window as any).google;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: 30.3935, lng: -86.4958 }, // Destin / Fort Walton Beach
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        setMapLoaded(true);

        const directionsService = new google.maps.DirectionsService();

        // Render directions for active routes
        const renderers: any[] = [];
        let totalDistanceMeters = 0;
        let totalDurationSeconds = 0;

        for (const route of activeRoutes) {
          if (route.stops.length < 2) {
            // If only 1 stop, place a native marker
            if (route.stops.length === 1) {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ address: route.stops[0].address }, (results: any, status: any) => {
                if (status === 'OK' && results && results[0]) {
                  new google.maps.Marker({
                    map,
                    position: results[0].geometry.location,
                    title: `${route.techName}: Stop 1 - ${route.stops[0].customer}`,
                    label: '1',
                  });
                  map.setCenter(results[0].geometry.location);
                }
              });
            }
            continue;
          }

          const renderer = new google.maps.DirectionsRenderer({
            map,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: route.colorHex.startsWith('#') ? route.colorHex : '#2563eb',
              strokeWeight: 5,
              strokeOpacity: 0.85,
            },
          });
          renderers.push(renderer);

          const origin = route.stops[0].address;
          const destination = route.stops[route.stops.length - 1].address;
          const waypoints = route.stops.slice(1, -1).map((s) => ({
            location: s.address,
            stopover: true,
          }));

          directionsService.route(
            {
              origin,
              destination,
              waypoints,
              travelMode: google.maps.TravelMode.DRIVING,
              optimizeWaypoints: false,
            },
            (result: any, status: any) => {
              if (status === google.maps.DirectionsStatus.OK && result) {
                renderer.setDirections(result);
                // Extract metrics
                const legs = result.routes[0]?.legs || [];
                legs.forEach((leg: any) => {
                  totalDistanceMeters += leg.distance?.value || 0;
                  totalDurationSeconds += leg.duration?.value || 0;
                });
                const miles = (totalDistanceMeters * 0.000621371).toFixed(1);
                const minutes = Math.round(totalDurationSeconds / 60);
                setRouteSummary({
                  distance: `${miles} miles`,
                  duration: `${minutes} mins`,
                  techName: selectedTechId === 'all' ? 'All Technicians' : route.techName,
                });
              } else {
                console.warn('[Google Maps Directions Error]:', status);
                setRouteError(`Directions request failed: ${status}`);
              }
            }
          );
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[Google Maps Init Error]:', err);
          setRouteError(err.message || 'Error initializing Google Maps');
        }
      }
    }

    initGoogleMaps();

    return () => {
      isCancelled = true;
    };
  }, [apiKey, activeRoutes, selectedTechId]);

  // Construct native Google Maps multi-stop directions link for the selected route
  const nativeGoogleMapsUrl = useMemo(() => {
    const firstActive = activeRoutes[0];
    if (!firstActive || firstActive.stops.length === 0) {
      return 'https://www.google.com/maps?q=Destin,FL';
    }
    const stopAddresses = firstActive.stops.map((s) => encodeURIComponent(s.address)).join('/');
    return `https://www.google.com/maps/dir/${stopAddresses}`;
  }, [activeRoutes]);

  const handleSaveKey = () => {
    if (inputKey.trim()) {
      localStorage.setItem('FSM_GOOGLE_MAPS_KEY', inputKey.trim());
      setApiKey(inputKey.trim());
      setShowKeyInput(false);
    }
  };

  return (
    <div className="bg-[#f8fafc] rounded-lg border border-slate-200 overflow-hidden shadow-xs flex flex-col w-full h-[680px]">
      {/* Top Controls Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Route Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Technician Route:</span>
          <select
            value={selectedTechId}
            onChange={(e) => setSelectedTechId(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#2d82b7] cursor-pointer"
          >
            <option value="all">All Active Routes ({techRoutes.length})</option>
            {techRoutes.map((tr) => (
              <option key={tr.techId} value={tr.techId}>
                {tr.techName} ({tr.stops.length} stop{tr.stops.length === 1 ? '' : 's'})
              </option>
            ))}
          </select>
        </div>

        {/* Route Metrics (Distance & Driving Time) */}
        {routeSummary && (
          <div className="flex items-center gap-3 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-md text-[11px] font-semibold">
            <span>Route: {routeSummary.techName}</span>
            <span>•</span>
            <span>{routeSummary.distance}</span>
            <span>•</span>
            <span>{routeSummary.duration} driving</span>
          </div>
        )}

        {/* Native Navigation Action & Key Config */}
        <div className="flex items-center gap-2">
          <a
            href={nativeGoogleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-[#be4646] hover:bg-[#a63a3a] text-white font-semibold rounded text-xs flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
            title="Open turn-by-turn directions in Google Maps"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open in Google Maps</span>
            <ExternalLink className="w-3 h-3 opacity-80" />
          </a>

          <button
            type="button"
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded text-xs flex items-center gap-1 transition-colors cursor-pointer"
            title="Configure Google Maps API Key"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{apiKey ? 'API Key Configured' : 'Set API Key'}</span>
          </button>
        </div>
      </div>

      {/* Optional API Key Input Banner */}
      {showKeyInput && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900 animate-in fade-in duration-150">
          <div className="flex items-center gap-2 flex-1">
            <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
            <span>
              Enter your Google Maps API Key (requires <strong>Routes API</strong> and <strong>Maps JavaScript API</strong> enabled):
            </span>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={inputKey}
              onChange={(e) => setInputKey(e.target.value)}
              className="px-2.5 py-1 bg-white border border-amber-300 rounded text-xs font-mono text-slate-800 w-64 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleSaveKey}
              className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white font-semibold rounded transition-colors"
            >
              Save Key
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowKeyInput(false)}
            className="text-amber-700 hover:text-amber-900 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Map View Area */}
      <div className="relative flex-1 w-full h-full bg-slate-100 overflow-hidden flex">
        {apiKey ? (
          /* NATIVE GOOGLE MAPS JAVASCRIPT API CONTAINER (NO SVG OVERLAYS) */
          <div ref={mapRef} className="w-full h-full" />
        ) : (
          /* NATIVE GOOGLE MAPS EMBED CONTAINER WITH EMERALD COAST STOPS */
          <div className="w-full h-full relative flex flex-col">
            <iframe
              title="Google Maps Emerald Coast Route"
              src={
                activeRoutes[0]?.stops.length && activeRoutes[0].stops.length >= 2
                  ? `https://maps.google.com/maps?saddr=${encodeURIComponent(activeRoutes[0].stops[0].address)}&daddr=${encodeURIComponent(activeRoutes[0].stops[activeRoutes[0].stops.length - 1].address)}&output=embed`
                  : 'https://maps.google.com/maps?q=30.3935,-86.4958&z=11&output=embed'
              }
              className="w-full h-full border-0"
              allowFullScreen
              loading="lazy"
            />

            {/* Clean Floating Notice Explaining Native Routes Key Setup */}
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-lg p-3 max-w-md text-xs text-slate-700 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Native Google Maps Directions</span>
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Displaying native Google Maps driving directions connecting {activeRoutes[0]?.stops.length || 0} stops across Fort Walton Beach, Destin, Niceville, and Miramar Beach.
              </p>
              <div className="pt-1 flex items-center gap-2">
                <a
                  href={nativeGoogleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[#be4646] hover:underline flex items-center gap-1 text-[11px]"
                >
                  <span>Launch Google Maps Route Navigation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Right Side Stops Panel: Lists canonical stops with clickable links */}
        <div className="w-72 bg-white border-l border-slate-200 flex flex-col shrink-0 h-full overflow-hidden">
          <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <span className="font-bold text-slate-800 text-xs">
              Stops ({activeRoutes.reduce((acc, r) => acc + r.stops.length, 0)})
            </span>
            <span className="text-[10px] text-slate-500 font-medium">
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-3">
            {activeRoutes.map((route) => (
              <div key={route.techId} className="space-y-1.5">
                <div className="flex items-center justify-between font-bold text-slate-800 text-xs px-1">
                  <span>{route.techName}</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {route.stops.length} stop{route.stops.length === 1 ? '' : 's'}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {route.stops.map((stop) => (
                    <div
                      key={stop.jobId}
                      className="p-2 bg-slate-50 hover:bg-slate-100 rounded-md border border-slate-200 text-xs space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <div className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-900 text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                            {stop.stopNumber}
                          </span>
                          <Link
                            href={`/jobs/${stop.jobNumber.replace(/[^0-9]/g, '') || stop.jobId.replace(/^appt-/, '')}`}
                            className="font-bold text-[#be4646] hover:underline"
                          >
                            #{stop.jobNumber}
                          </Link>
                        </div>
                        <span className="text-[10px] text-slate-500">{stop.startTime}</span>
                      </div>
                      <div className="font-medium text-slate-800 truncate pl-5">
                        {stop.customer}
                      </div>
                      <div className="text-slate-500 text-[10px] truncate pl-5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                        <span className="truncate">{stop.address}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
