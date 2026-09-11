'use client';

import React, { useEffect, useRef, useMemo } from 'react';

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
  const apiKey =
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyCPDRqGnaIEmVlHmX_nD8z30YK4Af98Hm0';

  // Compile routes data per technician from their real scheduled jobs
  const techRoutes: TechRouteData[] = useMemo(() => {
    const activeTechs = techUsers.filter((t) => selectedTechNames.includes(t.name));
    const result: TechRouteData[] = [];

    for (const tech of activeTechs) {
      const sortedJobs = [...(tech.scheduledJobs || [])].sort((a, b) =>
        (a.startTime || '').localeCompare(b.startTime || '')
      );

      const stops = sortedJobs.map((job, idx) => {
        let fullAddr = [job.addressStreet, job.addressCityStateZip].filter(Boolean).join(', ').trim();
        if (!fullAddr || fullAddr === ',') {
          fullAddr = 'Destin, FL 32541';
        }
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

  // Load Google Maps JavaScript API and render native Directions
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let isCancelled = false;
    let mapInstance: any = null;
    const renderers: any[] = [];
    const markers: any[] = [];

    async function initGoogleMaps() {
      try {
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
            script.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey + '&libraries=routes,geometry';
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Google Maps script.'));
            document.head.appendChild(script);
          });
        }

        if (isCancelled || !mapRef.current) return;
        const google = (window as any).google;

        mapInstance = new google.maps.Map(mapRef.current, {
          center: { lat: 30.3935, lng: -86.4958 }, // Emerald Coast (Destin, FL)
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
        });

        const directionsService = new google.maps.DirectionsService();

        for (const route of techRoutes) {
          if (route.stops.length < 2) {
            // Single stop: place a native marker
            if (route.stops.length === 1) {
              const geocoder = new google.maps.Geocoder();
              geocoder.geocode({ address: route.stops[0].address }, (results: any, status: any) => {
                if (status === 'OK' && results && results[0] && !isCancelled && mapInstance) {
                  const marker = new google.maps.Marker({
                    map: mapInstance,
                    position: results[0].geometry.location,
                    title: route.techName + ': Stop 1 - ' + route.stops[0].customer,
                    label: '1',
                  });
                  markers.push(marker);
                  mapInstance.setCenter(results[0].geometry.location);
                }
              });
            }
            continue;
          }

          const renderer = new google.maps.DirectionsRenderer({
            map: mapInstance,
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
              if (status === google.maps.DirectionsStatus.OK && result && !isCancelled) {
                renderer.setDirections(result);
              }
            }
          );
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('[Google Maps Init Error]:', err);
        }
      }
    }

    initGoogleMaps();

    return () => {
      isCancelled = true;
      renderers.forEach((r: any) => r.setMap(null));
      markers.forEach((m: any) => m.setMap(null));
    };
  }, [apiKey, techRoutes]);

  return (
    <div className="w-full h-[700px] rounded-lg border border-slate-200 overflow-hidden shadow-xs relative bg-slate-100">
      <div ref={mapRef} className="w-full h-full" />
    </div>
  );
}
