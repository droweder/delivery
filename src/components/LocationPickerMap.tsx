/// <reference types="vite/client" />
import React, { useState, useEffect, useRef } from 'react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { geocodeAddress } from '../lib/geocode';

interface LocationPickerMapProps {
  enderecoCompleto?: string;
  lat: number;
  lng: number;
  onChangeLocation: (lat: number, lng: number) => void;
}

export function LocationPickerMap({ enderecoCompleto, lat, lng, onChangeLocation }: LocationPickerMapProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const [markerPosition, setMarkerPosition] = useState({ lat, lng });
  const [mapCenter, setMapCenter] = useState({ lat, lng });
  const lastGeocodedAddress = useRef('');

  // Update center when props change (if no manual drag recently)
  useEffect(() => {
    setMarkerPosition({ lat, lng });
    setMapCenter({ lat, lng });
  }, [lat, lng]);

  useEffect(() => {
    async function updateFromAddress() {
      if (enderecoCompleto && enderecoCompleto.length > 5 && enderecoCompleto !== lastGeocodedAddress.current) {
        lastGeocodedAddress.current = enderecoCompleto;
        const result = await geocodeAddress(enderecoCompleto);
        if (result) {
          setMarkerPosition(result);
          setMapCenter(result);
          onChangeLocation(result.lat, result.lng);
        }
      }
    }
    
    // Debounce the geocode request
    const timeoutId = setTimeout(() => {
      updateFromAddress();
    }, 1500);
    
    return () => clearTimeout(timeoutId);
  }, [enderecoCompleto, onChangeLocation]);

  if (!apiKey) {
    return (
      <div className="w-full h-full min-h-[150px] bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-slate-500 text-xs p-4 text-center">
        <span className="mb-2 text-xl">🗺️</span>
        <span className="font-bold mb-1">Mapa indisponível</span>
        <span>Configure a variável <code>VITE_GOOGLE_MAPS_API_KEY</code> no arquivo .env para exibir o mapa.</span>
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
        <Map
          defaultZoom={16}
          center={mapCenter}
          onCenterChanged={(ev) => setMapCenter(ev.detail.center)}
          onClick={handleMapClick}
          mapId="DEMO_MAP_ID"
          disableDefaultUI={true}
          gestureHandling="greedy"
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
