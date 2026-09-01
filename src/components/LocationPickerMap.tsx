/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map as GoogleMap, AdvancedMarker } from '@vis.gl/react-google-maps';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { geocodeAddress } from '../lib/geocode';
import { AlertTriangle, MapPin, RefreshCw } from 'lucide-react';

// Fix Leaflet marker icon issue
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface LocationPickerMapProps {
  enderecoCompleto?: string;
  lat: number;
  lng: number;
  onChangeLocation: (lat: number, lng: number) => void;
}

function LeafletMapEvents({
  markerPosition,
  setMarkerPosition,
  onChangeLocation,
}: {
  markerPosition: { lat: number; lng: number };
  setMarkerPosition: (pos: { lat: number; lng: number }) => void;
  onChangeLocation: (lat: number, lng: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setMarkerPosition({ lat, lng });
      onChangeLocation(lat, lng);
    },
  });

  useEffect(() => {
    map.setView(markerPosition, map.getZoom());
  }, [markerPosition, map]);

  return (
    <Marker
      position={markerPosition}
      draggable={true}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const position = marker.getLatLng();
          setMarkerPosition({ lat: position.lat, lng: position.lng });
          onChangeLocation(position.lat, position.lng);
        },
      }}
    />
  );
}

export function LocationPickerMap({ enderecoCompleto, lat, lng, onChangeLocation }: LocationPickerMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [markerPosition, setMarkerPosition] = useState({ lat: lat || -23.55052, lng: lng || -46.633308 });
  const [mapCenter, setMapCenter] = useState({ lat: lat || -23.55052, lng: lng || -46.633308 });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const lastGeocodedAddress = useRef('');

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

  if (!apiKey || isPreview) {
    return (
      <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-3 text-slate-700 dark:text-slate-300 text-xs">
        <div>
          <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400 mb-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Google Maps Indisponível</span>
            </div>
            {isGeocoding && (
              <span className="text-[10px] flex items-center gap-1 text-blue-600 dark:text-blue-400 font-normal">
                <RefreshCw className="w-3 h-3 animate-spin" /> Buscando endereço...
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            A conexão com a API do Google Maps está indisponível no momento. Use o mapa abaixo para tocar ou arrastar o pino e definir a localização exata do cliente.
          </p>
        </div>

        {/* Mapa Interativo Fallback (OpenStreetMap via Leaflet) */}
        <div className="w-full h-48 rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 relative bg-slate-100 dark:bg-slate-800 z-0">
          <MapContainer
            center={markerPosition}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LeafletMapEvents
              markerPosition={markerPosition}
              setMarkerPosition={setMarkerPosition}
              onChangeLocation={onChangeLocation}
            />
          </MapContainer>
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
      <APIProvider apiKey={apiKey}>
        <GoogleMap
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
        </GoogleMap>
      </APIProvider>
      <div className="absolute bottom-2 left-2 right-2 pointer-events-none">
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur text-[10px] font-bold text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg shadow-sm text-center border border-slate-200 dark:border-slate-700">
          📍 Arraste o pino ou toque no mapa para ajustar a localização exata.
        </div>
      </div>
    </div>
  );
}

