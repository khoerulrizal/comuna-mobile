// Peta absensi (Leaflet/OpenStreetMap via WebView) — TANPA API key, jalan di
// Expo Go maupun dev build. Menampilkan titik user (absensi), titik acuan
// (kantor/rumah), radius geofence, dan garis penghubung.
import { View } from "react-native";
import { WebView } from "react-native-webview";

export interface PunchMapProps {
  userLat: number;
  userLng: number;
  refLat?: number | null;
  refLng?: number | null;
  refName?: string | null;
  refRadius?: number | null;
  height?: number;
}

function buildHtml(p: PunchMapProps): string {
  const hasRef = p.refLat != null && p.refLng != null;
  const refName = JSON.stringify(p.refName || "Lokasi acuan");
  const userName = JSON.stringify("Titik absensi");
  const refBlock = hasRef
    ? `
      var r=[${p.refLat},${p.refLng}];
      pts.push(r);
      L.circle(r,{radius:${p.refRadius || 100},color:'#2FB47A',weight:1.5,fillColor:'#2FB47A',fillOpacity:0.12}).addTo(map);
      L.circleMarker(r,{radius:7,weight:2,color:'#fff',fillColor:'#2FB47A',fillOpacity:1}).addTo(map).bindTooltip(${refName},{permanent:true,direction:'top',className:'tt'});
      L.polyline([u,r],{color:'#6B5BFF',weight:2,dashArray:'5,6',opacity:0.75}).addTo(map);
    `
    : "";
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
  var u=[${p.userLat},${p.userLng}];
  var map=L.map('map',{zoomControl:false,attributionControl:false,dragging:false,doubleClickZoom:false,scrollWheelZoom:false,touchZoom:false,boxZoom:false,keyboard:false,tap:false});
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var pts=[u];
  L.circleMarker(u,{radius:8,weight:3,color:'#fff',fillColor:'#6B5BFF',fillOpacity:1}).addTo(map).bindTooltip(${userName},{permanent:true,direction:'bottom',className:'tt'});
  ${refBlock}
  if(pts.length>1){ map.fitBounds(pts,{padding:[42,42],maxZoom:17}); } else { map.setView(u,16); }
</script></body></html>`;
}

export function PunchMap(props: PunchMapProps) {
  const { height = 150 } = props;
  return (
    <View style={{ height, borderRadius: 12, overflow: "hidden", backgroundColor: "#e9eef5" }}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: buildHtml(props) }}
        style={{ flex: 1, backgroundColor: "#e9eef5" }}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        androidLayerType="hardware"
      />
    </View>
  );
}
