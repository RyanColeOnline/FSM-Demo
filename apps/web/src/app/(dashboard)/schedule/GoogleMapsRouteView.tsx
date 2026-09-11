'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import type { ScheduledJob } from './page';

export interface MapJobItem extends ScheduledJob {
  techName?: string;
  colorHex?: string;
}

interface GoogleMapsRouteViewProps {
  jobs: MapJobItem[];
  selectedUser: string;
  selectedDate: Date;
  onHoverAppointment: (job: ScheduledJob, clientX: number, clientY: number) => void;
  onLeaveAppointment: () => void;
  onSelectAppointment?: (job: ScheduledJob) => void;
}

const EMERALD_COAST_COORDS: Array<{ match: RegExp; lat: number; lng: number }> = [
  // Destin
  { match: /400\s+Harbor/i, lat: 30.3933, lng: -86.5015 },
  { match: /4100\s+Legendary/i, lat: 30.3857, lng: -86.4312 },
  { match: /102\s+Gulf\s+Shore/i, lat: 30.3905, lng: -86.5120 },
  { match: /312\s+Gulf\s+Shore/i, lat: 30.3890, lng: -86.5140 },
  { match: /740\s+Highway\s+98/i, lat: 30.3880, lng: -86.4750 },
  { match: /742\s+Scenic\s+Highway/i, lat: 30.3875, lng: -86.4450 },
  { match: /1000\s+Highway\s+98/i, lat: 30.3895, lng: -86.4680 },
  { match: /201\s+Harbor/i, lat: 30.3940, lng: -86.5040 },
  // Fort Walton Beach
  { match: /184\s+Eglin/i, lat: 30.4285, lng: -86.6178 },
  { match: /940\s+Santa\s+Rosa/i, lat: 30.3958, lng: -86.6025 },
  { match: /1200\s+Miracle\s+Strip/i, lat: 30.3980, lng: -86.5850 },
  { match: /312\s+Eglin/i, lat: 30.4320, lng: -86.6180 },
  { match: /100\s+Innovation/i, lat: 30.4350, lng: -86.6200 },
  // Niceville
  { match: /100\s+College/i, lat: 30.5218, lng: -86.4862 },
  { match: /4550\s+E\s+Highway\s+20/i, lat: 30.5050, lng: -86.4250 },
  // Miramar Beach
  { match: /600\s+Grand/i, lat: 30.3795, lng: -86.3265 },
  { match: /500\s+Grand/i, lat: 30.3800, lng: -86.3280 },
  { match: /10400\s+US\s+Highway/i, lat: 30.3820, lng: -86.3500 },
  { match: /1800\s+Scenic\s+Gulf/i, lat: 30.3780, lng: -86.3650 },
  // 30A / South Walton
  { match: /Santa\s+Rosa\s+Beach/i, lat: 30.3580, lng: -86.2290 },
  { match: /Seaside/i, lat: 30.3195, lng: -86.1375 },
  { match: /Rosemary/i, lat: 30.2785, lng: -86.0145 },
  { match: /Alys/i, lat: 30.2855, lng: -86.0280 },
  { match: /Inlet\s+Beach/i, lat: 30.2760, lng: -86.0020 },
];

function getCoordinatesForJob(job: MapJobItem): { lat: number; lng: number } {
  const fullAddr = `${job.addressStreet || ''} ${job.addressCityStateZip || ''}`;
  for (const item of EMERALD_COAST_COORDS) {
    if (item.match.test(fullAddr)) {
      return { lat: item.lat, lng: item.lng };
    }
  }

  // Deterministic jitter based on appointment id
  let hash = 0;
  for (let i = 0; i < job.id.length; i++) {
    hash = (hash << 5) - hash + job.id.charCodeAt(i);
    hash |= 0;
  }
  const jitterLat = ((Math.abs(hash) % 100) - 50) * 0.0003;
  const jitterLng = ((Math.abs(hash >> 2) % 100) - 50) * 0.0003;

  const lower = fullAddr.toLowerCase();
  if (lower.includes('niceville')) {
    return { lat: 30.5180 + jitterLat, lng: -86.4820 + jitterLng };
  }
  if (lower.includes('fort walton') || lower.includes('32547') || lower.includes('32548')) {
    return { lat: 30.4200 + jitterLat, lng: -86.6150 + jitterLng };
  }
  if (lower.includes('miramar') || lower.includes('32550')) {
    return { lat: 30.3810 + jitterLat, lng: -86.3450 + jitterLng };
  }
  if (lower.includes('santa rosa') || lower.includes('30a') || lower.includes('32459')) {
    return { lat: 30.3450 + jitterLat, lng: -86.2000 + jitterLng };
  }
  return { lat: 30.3935 + jitterLat, lng: -86.4958 + jitterLng };
}

function normalizeName(name?: string | null): string {
  if (!name) return '';
  return name.replace(/\s*\(\s*/g, ' (').replace(/\s*\)\s*/g, ') ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function createPinIcon(google: any, color: string) {
  const safeColor = color && color.startsWith('#') ? color : '#be4646';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40">
      <defs>
        <filter id="p-sh" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M15 1C7.3 1 1 7.3 1 15c0 10.8 14 24 14 24s14-13.2 14-24c0-7.7-6.3-14-14-14z" fill="${safeColor}" stroke="#ffffff" stroke-width="2" filter="url(#p-sh)"/>
      <circle cx="15" cy="14" r="6" fill="#ffffff"/>
      <path d="M12 14l2 2 4-4" stroke="${safeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>
  `;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim()),
    scaledSize: new google.maps.Size(30, 40),
    anchor: new google.maps.Point(15, 39),
  };
}

export default function GoogleMapsRouteView({
  jobs,
  selectedUser,
  selectedDate,
  onHoverAppointment,
  onLeaveAppointment,
  onSelectAppointment,
}: GoogleMapsRouteViewProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersMapRef = useRef<Map<string, { marker: any; job: MapJobItem }>>(new Map());
  const lastBoundsKeyRef = useRef<string>('');

  // Keep latest callbacks in ref to avoid recreating markers or re-running effects on hover
  const callbacksRef = useRef({
    onHoverAppointment,
    onLeaveAppointment,
    onSelectAppointment,
  });

  useEffect(() => {
    callbacksRef.current = {
      onHoverAppointment,
      onLeaveAppointment,
      onSelectAppointment,
    };
  });

  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyCPDRqGnaIEmVlHmX_nD8z30YK4Af98Hm0';

  // Filter jobs based on selected user
  const displayJobs = useMemo(() => {
    if (!selectedUser || selectedUser === 'all') return jobs;
    const normSel = normalizeName(selectedUser);
    return jobs.filter((j) => {
      if (j.techName && normalizeName(j.techName) === normSel) return true;
      if (j.technicians && j.technicians.some((t) => normalizeName(t) === normSel)) return true;
      return false;
    });
  }, [jobs, selectedUser]);

  // Initialize Map once
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let isCancelled = false;

    async function initMap() {
      try {
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
            script.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=geometry';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
            document.head.appendChild(script);
          });
        }

        if (isCancelled || !mapRef.current) return;
        const google = (window as any).google;

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new google.maps.Map(mapRef.current, {
            center: { lat: 30.3935, lng: -86.4958 }, // Emerald Coast (Destin, FL)
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
          });
        }
      } catch (err) {
        console.error('[Google Maps Init Error]:', err);
      }
    }

    initMap();

    return () => {
      isCancelled = true;
    };
  }, [apiKey]);

  // Reconcile Markers stably without destroying them on hover
  useEffect(() => {
    const google = (window as any).google;
    const map = mapInstanceRef.current;
    if (!google || !map) return;

    const currentMap = markersMapRef.current;
    const activeIds = new Set(displayJobs.map((j) => j.id));

    // Remove obsolete markers that are no longer in displayJobs
    currentMap.forEach((item, id) => {
      if (!activeIds.has(id)) {
        item.marker.setMap(null);
        currentMap.delete(id);
      }
    });

    if (displayJobs.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    displayJobs.forEach((job) => {
      const coords = getCoordinatesForJob(job);
      const pos = new google.maps.LatLng(coords.lat, coords.lng);
      bounds.extend(pos);

      const existing = currentMap.get(job.id);
      if (existing) {
        // Keep existing marker stable in the DOM to avoid any hover flicker
        existing.job = job;
      } else {
        // Create new marker
        const marker = new google.maps.Marker({
          position: pos,
          map: map,
          icon: createPinIcon(google, job.colorHex || '#be4646'),
          title: `${job.jobNumber} - ${job.customer}`,
        });

        marker.addListener('mouseover', (e: any) => {
          const domEvent = e?.domEvent as MouseEvent | undefined;
          const clientX = domEvent?.clientX ?? 300;
          const clientY = domEvent?.clientY ?? 200;
          callbacksRef.current.onHoverAppointment(job, clientX, clientY);
        });

        marker.addListener('mouseout', () => {
          callbacksRef.current.onLeaveAppointment();
        });

        marker.addListener('click', () => {
          callbacksRef.current.onSelectAppointment?.(job);
        });

        currentMap.set(job.id, { marker, job });
      }
    });

    // Only update map bounds if the active appointments or selected user actually changed
    const boundsKey = `${selectedUser}_${Array.from(activeIds).sort().join(',')}`;
    if (lastBoundsKeyRef.current !== boundsKey) {
      lastBoundsKeyRef.current = boundsKey;
      if (displayJobs.length === 1) {
        map.setCenter(bounds.getCenter());
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, { top: 60, bottom: 60, left: 60, right: 60 });
        google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
          if (map.getZoom() > 14) {
            map.setZoom(14);
          }
        });
      }
    }
  }, [displayJobs, selectedUser]);

  // Cleanup all markers on unmount
  useEffect(() => {
    return () => {
      markersMapRef.current.forEach((item) => item.marker.setMap(null));
      markersMapRef.current.clear();
      lastBoundsKeyRef.current = '';
    };
  }, []);

  return (
    <div className="w-full h-[700px] rounded-lg border border-slate-200 overflow-hidden shadow-xs relative bg-slate-100">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
