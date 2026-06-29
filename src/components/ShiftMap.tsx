// Peta lokasi shift (Leaflet/OpenStreetMap via WebView) — TANPA API key. Sama
// gaya dgn PunchMap di detail kehadiran, tapi tanpa titik user: menampilkan satu
// atau beberapa titik kantor/rumah + radius geofence masing-masing.
import { View } from "react-native";
import { WebView } from "react-native-webview";

export interface ShiftMapPoint {
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
}

export interface ShiftMapProps {
  points: ShiftMapPoint[];
  height?: number;
}

function buildHtml(points: ShiftMapPoint[]): string {
  const markers = points
    .map((p) => {
      const nm = JSON.stringify(p.name || "Lokasi");
      return `
      (function(){
        var c=[${p.latitude},${p.longitude}];
        pts.push(c);
        L.circle(c,{radius:${p.radius || 100},color:'#2FB47A',weight:1.5,fillColor:'#2FB47A',fillOpacity:0.12}).addTo(map);
        L.circleMarker(c,{radius:7,weight:2,color:'#fff',fillColor:'#2FB47A',fillOpacity:1}).addTo(map).bindTooltip(${nm},{permanent:true,direction:'top',className:'tt'});
      })();`;
    })
    .join("\n");
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
  html,body{margin:0;height:100%}#map{height:100%;width:100%;background:#e9eef5}
  .tt{background:#fff;border:none;box-shadow:0 1px 4px rgba(0,0,0,.18);border-radius:6px;font:600 11px -apple-system,Arial;color:#1B1830;padding:2px 6px}
  .leaflet-tooltip-top:before{display:none}
</style></head><body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,doubleClickZoom:false,scrollWheelZoom:false,touchZoom:false,boxZoom:false,keyboard:false,tap:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var pts=[];
  ${markers}
  if(pts.length>1){ map.fitBounds(pts,{padding:[42,42],maxZoom:16}); }
  else if(pts.length===1){ map.setView(pts[0],16); }
  else { map.setView([-6.2,106.8],11); }
</script></body></html>`;
}

export function ShiftMap({ points, height = 150 }: ShiftMapProps) {
  return (
    <View style={{ height, borderRadius: 12, overflow: "hidden", backgroundColor: "#e9eef5" }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: buildHtml(points) }}
        style={{ flex: 1, backgroundColor: "#e9eef5" }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
      />
    </View>
  );
}
