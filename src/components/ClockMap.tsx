// Peta clock-in (expo-maps): titik user + titik acuan (kantor/rumah) + lingkaran radius.
// Di-guard MAPS_ENABLED: bila OFF (default) → null, layar fallback ke teks koordinat.
// expo-maps butuh DEV BUILD (+ Android: Google Maps API key). Di Expo Go → biarkan OFF.
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { Platform, View, type ViewStyle } from "react-native";
import { MAPS_ENABLED } from "@/lib/config";
import { colors, radii } from "@/theme/tokens";

/* eslint-disable @typescript-eslint/no-explicit-any */
let GoogleMaps: any = null;
let AppleMaps: any = null;
if (MAPS_ENABLED) {
  try {
    const m = require("expo-maps");
    GoogleMaps = m.GoogleMaps;
    AppleMaps = m.AppleMaps;
  } catch {
    // native module absen (mis. Expo Go) → fallback.
  }
}

export interface MapOffice {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  /** "home" → warna hijau (rumah), selain itu ungu brand (kantor). */
  kind?: "office" | "home";
}

/** Handle imperatif: pindahkan kamera ke koordinat tertentu. */
export interface ClockMapHandle {
  recenter: (coords: { latitude: number; longitude: number }, zoom?: number) => void;
}

/** Apakah peta native benar-benar tersedia (dev build + modul terpasang). */
export const MAP_AVAILABLE =
  MAPS_ENABLED && (Platform.OS === "ios" ? !!AppleMaps?.View : !!GoogleMaps?.View);

export const ClockMap = forwardRef<
  ClockMapHandle,
  {
    user: { latitude: number; longitude: number } | null;
    offices: MapOffice[];
    /** Koordinat pusat kamera awal (default: user, lalu titik acuan pertama). */
    center?: { latitude: number; longitude: number } | null;
    zoom?: number;
    style?: ViewStyle;
  }
>(function ClockMap({ user, offices, center, zoom = 16, style }, ref) {
  const mapRef = useRef<any>(null);

  useImperativeHandle(
    ref,
    () => ({
      recenter: (coords, z) => {
        mapRef.current?.setCameraPosition?.({ coordinates: coords, zoom: z ?? zoom });
      },
    }),
    [zoom],
  );

  const MapView = Platform.OS === "ios" ? AppleMaps?.View : GoogleMaps?.View;

  const focus =
    center ?? user ?? (offices[0] ? { latitude: offices[0].latitude, longitude: offices[0].longitude } : null);

  // Pin kantor = biru primary brand, rumah = hijau mint (selaras lingkaran radius).
  // Lokasi user memakai titik biru native (isMyLocationEnabled), tak perlu pin sendiri.
  // `tintColor` hanya didukung Apple Maps (iOS); Google Maps mengabaikannya.
  const markers = useMemo(
    () =>
      offices.map((o, i) => ({
        id: `ref-${i}`,
        coordinates: { latitude: o.latitude, longitude: o.longitude },
        title: o.name,
        tintColor: o.kind === "home" ? colors.mint[500] : colors.brand[500],
      })),
    [offices],
  );

  const circles = useMemo(
    () =>
      offices.map((o) => {
        const home = o.kind === "home";
        const line = home ? colors.mint[500] : colors.brand[500];
        return {
          center: { latitude: o.latitude, longitude: o.longitude },
          radius: o.radius,
          color: home ? "rgba(16,185,129,0.14)" : "rgba(107,91,255,0.14)",
          lineColor: line,
          lineWidth: 2,
        };
      }),
    [offices],
  );

  if (!MapView || !focus) {
    // Fallback non-peta: kotak abu netral (overlay tetap tampil di atasnya).
    return <View style={[{ backgroundColor: colors.neutral[100], borderRadius: radii.lg }, style]} />;
  }

  return (
    <View style={[{ overflow: "hidden" }, style]}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        cameraPosition={{ coordinates: { latitude: focus.latitude, longitude: focus.longitude }, zoom }}
        markers={markers}
        circles={circles}
        uiSettings={
          Platform.OS === "ios"
            ? { myLocationButtonEnabled: false, compassEnabled: false, scaleBarEnabled: false }
            : {
                myLocationButtonEnabled: false,
                compassEnabled: false,
                scaleBarEnabled: false,
                zoomControlsEnabled: false,
                mapToolbarEnabled: false,
              }
        }
        properties={{ isMyLocationEnabled: true }}
      />
    </View>
  );
});
