/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { geocodeAddress } from '../lib/geocode';
import { AlertTriangle, MapPin, ExternalLink, RefreshCw } from 'lucide-react';

interface LocationPickerMapProps {
  enderecoCompleto?: string;
  lat: number;
  lng: number;
  onChangeLocation: (lat: number, lng: number) => void;
}

export function LocationPickerMap({ enderecoCompleto, lat, lng, onChangeLocation }: LocationPickerMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [markerPosition, setMarkerPosition] = useState({ lat: lat || -23.55052, lng: lng || -46.633308 });
  const [mapCenter, setMapCenter] = useState({ lat: lat || -23.55052, lng: lng || -46.633308 });
  const [mapAuthError, setMapAuthError] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const lastGeocodedAddress = useRef('');

  // Detect Google Maps Authentication / Referrer errors globally
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const msg = event.message || '';
      if (
        msg.includes('Google Maps') ||
        msg.includes('RefererNotAllowedMapError') ||
        msg.includes('gm_authFailure') ||
        msg.includes('Script error.') ||
        (event.filename && event.filename.includes('maps.googleapis.com'))
      ) {
        event.preventDefault(); // Stop error from bubbling to window (prevents Vite overlay)
        event.stopPropagation();
        setMapAuthError(true);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const msg = event.reason?.message || event.reason?.toString() || '';
      if (
        msg.includes('Google Maps') ||
        msg.includes('RefererNotAllowedMapError') ||
        msg.includes('gm_authFailure')
      ) {
        event.preventDefault();
        setMapAuthError(true);
      }
    };

    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const msg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
      if (
        msg.includes('Google Maps') ||
        msg.includes('RefererNotAllowedMapError') ||
        msg.includes('gm_authFailure')
      ) {
        setMapAuthError(true);
        return; // Don't log to console, preventing Vite overlay
      }
      originalConsoleError.apply(console, args);
    };

    const prevAuthFailure = (window as any).gm_authFailure;
    (window as any).gm_authFailure = () => {
      setMapAuthError(true);
      if (typeof prevAuthFailure === 'function') {
        prevAuthFailure();
      }
    };

    window.addEventListener('error', handleGlobalError, true); // Use capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      (window as any).gm_authFailure = prevAuthFailure;
      console.error = originalConsoleError;
    };
  }, []);

  // Update center when props change
  useEffect(() => {
    if (lat && lng && (lat !== markerPosition.lat || lng !== markerPosition.lng)) {
      setMarkerPosition({ lat, lng });
      setMapCenter({ lat, lng });
    }
  }, [lat, lng]);

  useEffect(() => {
    async function updateFromAddress() {
      if (enderecoCompleto && enderecoCompleto.length > 5 && enderecoCompleto !== lastGeocodedAddress.current) {
        lastGeocodedAddress.current = enderecoCompleto;
        setIsGeocoding(true);
        try {
          const result = await geocodeAddress(enderecoCompleto);
          if (result) {
            setMarkerPosition(result);
            setMapCenter(result);
            onChangeLocation(result.lat, result.lng);
          }
        } finally {
          setIsGeocoding(false);
        }
      }
    }
    
    // Debounce the geocode request
    const timeoutId = setTimeout(() => {
      updateFromAddress();
    }, 1200);
    
    return () => clearTimeout(timeoutId);
  }, [enderecoCompleto, onChangeLocation]);

  const handleManualCoordChange = (newLat: number, newLng: number) => {
    setMarkerPosition({ lat: newLat, lng: newLng });
    setMapCenter({ lat: newLat, lng: newLng });
    onChangeLocation(newLat, newLng);
  };

  // Se estiver rodando no Cloud Run (preview do AI Studio) e a chave não foi autorizada pra isso, pular o Google Maps
  const isPreview = typeof window !== 'undefined' && window.location.hostname.includes('run.app');

  if (!apiKey || mapAuthError || isPreview) {
    const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://delivery.droweder.com.br';
    const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${markerPosition.lng - 0.005}%2C${markerPosition.lat - 0.005}%2C${markerPosition.lng + 0.005}%2C${markerPosition.lat + 0.005}&layer=mapnik&marker=${markerPosition.lat}%2C${markerPosition.lng}`;

    return (
      <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3 text-slate-700 dark:text-slate-300 text-xs">
        <div>
          <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400 mb-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Restrição de Domínio no Google Maps</span>
            </div>
            {isGeocoding && (
              <span className="text-[10px] flex items-center gap-1 text-blue-600 dark:text-blue-400 font-normal">
                <RefreshCw className="w-3 h-3 animate-spin" /> Buscando endereço...
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Sua chave Google Maps está restrita ao domínio principal. Para liberar o preview, adicione{' '}
            <code className="bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 px-1 py-0.5 rounded font-mono text-[10px]">
              {currentOrigin}/*
            </code>{' '}
            e{' '}
            <code className="bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-200 px-1 py-0.5 rounded font-mono text-[10px]">
              https://delivery.droweder.com.br/*
            </code>{' '}
            nas restrições de HTTP do Google Cloud Console.
          </p>
        </div>

        {/* Mapa Interativo Fallback (OpenStreetMap) */}
        <div className="w-full h-36 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-800">
          <iframe
            title="Localização do Cliente"
            className="w-full h-full border-0 pointer-events-auto"
            src={osmUrl}
            loading="lazy"
          />
        </div>

        {/* Coordenadas Manuais Fallback */}
        <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-500" />
              Coordenadas Selecionadas:
            </span>
            <span className="font-mono text-[10px] text-slate-500">
              {markerPosition.lat.toFixed(5)}, {markerPosition.lng.toFixed(5)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={markerPosition.lat}
                onChange={(e) => handleManualCoordChange(parseFloat(e.target.value) || 0, markerPosition.lng)}
                className="w-full text-xs font-mono p-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={markerPosition.lng}
                onChange={(e) => handleManualCoordChange(markerPosition.lat, parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-mono p-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleMapClick = (e: any) => {
    if (e.detail?.latLng) {
      const newLat = e.detail.latLng.lat;
      const newLng = e.detail.latLng.lng;
      setMarkerPosition({ lat: newLat, lng: newLng });
      onChangeLocation(newLat, newLng);
    }
  };

  const handleMarkerDragEnd = (e: any) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setMarkerPosition({ lat: newLat, lng: newLng });
      onChangeLocation(newLat, newLng);
    }
  };

  return (
    <div className="w-full h-full min-h-[150px] rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 relative shadow-inner">
      <APIProvider apiKey={apiKey} onError={() => setMapAuthError(true)}>
        <Map
          defaultZoom={16}
          center={mapCenter}
          onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
          onClick={handleMapClick}
          mapId="DEMO_MAP_ID"
          disableDefaultUI={true}
          gestureHandling="greedy"
          internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        >
          <AdvancedMarker
            position={markerPosition}
            draggable={true}
            onDragEnd={handleMarkerDragEnd}
          />
        </Map>
      </APIProvider>
      <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur text-[10px] font-bold text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg shadow-sm text-center border border-slate-200 dark:border-slate-700">
          📍 Arraste o pino ou toque no mapa para ajustar a localização exata.
        </div>
      </div>
    </div>
  );
}

