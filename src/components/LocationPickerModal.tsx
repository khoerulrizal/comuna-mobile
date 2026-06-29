// Pemilih lokasi (peta + pin + cari alamat) untuk aktivitas Field.
// Default: Google Maps JS (Maps JavaScript API + Places) di WebView, pakai
// EXPO_PUBLIC_GOOGLE_MAPS_API_KEY. Bila key kosong → fallback OpenStreetMap.
// Mengembalikan {lat,lng,address}.
import { Modal, Pressable, View } from "react-native";
import { WebView } from "react-native-webview";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Txt } from "@/components/ui";
import { colors } from "@/theme/tokens";
import { GOOGLE_MAPS_API_KEY, API_BASE_URL } from "@/lib/config";

export interface PickedLocation {
  lat: number;
  lng: number;
  address: string;
}

const SHARED_CSS = `
  html,body{margin:0;height:100%;font-family:-apple-system,Roboto,Arial,sans-serif}
  #map{position:absolute;top:96px;bottom:74px;left:0;right:0;background:#e9eef5}
  .bar{position:absolute;top:0;left:0;right:0;padding:10px;z-index:1000;background:#fff;border-bottom:1px solid #EDEAF5}
  .row{display:flex;gap:8px}
  #q{flex:1;border:1px solid #DAD4E8;border-radius:10px;padding:10px 12px;font-size:14px;outline:none}
  #go{border:none;background:#6B5BFF;color:#fff;border-radius:10px;padding:0 14px;font-weight:700}
  #addr{font-size:11px;color:#6B6483;margin-top:6px;line-height:1.3;max-height:28px;overflow:hidden}
  .pac-container{z-index:2000!important}
  .cf{position:absolute;bottom:0;left:0;right:0;padding:12px;background:#fff;border-top:1px solid #EDEAF5;z-index:1000}
  #pick{width:100%;border:none;background:#6B5BFF;color:#fff;border-radius:12px;padding:14px;font-size:15px;font-weight:800}
  #err{position:absolute;inset:96px 0 74px;display:none;align-items:center;justify-content:center;text-align:center;padding:24px;color:#B31E45;font-size:13px}
`;

function buildHtmlGoogle(lat: number, lng: number, address: string, key: string): string {
  const a = JSON.stringify(address || "");
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<style>${SHARED_CSS}</style></head><body>
<div class="bar"><div class="row"><input id="q" placeholder="Cari alamat / tempat..."/><button id="go" style="display:none"></button></div><div id="addr"></div></div>
<div id="map"></div>
<div id="err">Gagal memuat Google Maps. Periksa API key / izin referrer.</div>
<div class="cf"><button id="pick">Pilih lokasi ini</button></div>
<script>
  var cur={lat:${lat},lng:${lng},address:${a}};
  var addrEl=document.getElementById('addr'); addrEl.textContent=cur.address||'Geser pin atau cari alamat';
  function setAddr(t){ cur.address=t||''; addrEl.textContent=t||('Lat '+cur.lat.toFixed(5)+', Lng '+cur.lng.toFixed(5)); }
  window.gm_authFailure=function(){ document.getElementById('err').style.display='flex'; };
  window.initMap=function(){
    var map=new google.maps.Map(document.getElementById('map'),{center:cur,zoom:15,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,clickableIcons:false});
    var marker=new google.maps.Marker({position:cur,map:map,draggable:true});
    var geocoder=new google.maps.Geocoder();
    function reverse(){ geocoder.geocode({location:{lat:cur.lat,lng:cur.lng}},function(res,st){ if(st==='OK'&&res&&res[0]) setAddr(res[0].formatted_address); }); }
    function moveTo(lat,lng,addr,zoom){ cur.lat=lat;cur.lng=lng;marker.setPosition({lat:lat,lng:lng});map.panTo({lat:lat,lng:lng}); if(zoom)map.setZoom(zoom); if(addr){setAddr(addr)}else{reverse()} }
    marker.addListener('dragend',function(e){ cur.lat=e.latLng.lat();cur.lng=e.latLng.lng();reverse(); });
    map.addListener('click',function(e){ moveTo(e.latLng.lat(),e.latLng.lng()); });
    var ac=new google.maps.places.Autocomplete(document.getElementById('q'),{fields:['geometry','formatted_address','name']});
    ac.bindTo('bounds',map);
    ac.addListener('place_changed',function(){ var p=ac.getPlace(); if(p&&p.geometry&&p.geometry.location){ var l=p.geometry.location; moveTo(l.lat(),l.lng(),p.formatted_address||p.name,16); } });
  };
  document.getElementById('pick').onclick=function(){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'pick',lat:cur.lat,lng:cur.lng,address:cur.address})); };
</script>
<script async defer src="https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=id&callback=initMap" onerror="document.getElementById('err').style.display='flex'"></script>
</body></html>`;
}

function buildHtmlOSM(lat: number, lng: number, address: string): string {
  const a = JSON.stringify(address || "");
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>${SHARED_CSS}
  #res{position:absolute;top:64px;left:10px;right:10px;background:#fff;border:1px solid #EDEAF5;border-radius:10px;box-shadow:0 6px 18px rgba(20,16,45,.12);max-height:200px;overflow:auto;z-index:2000}
  #res div{padding:10px 12px;font-size:12.5px;border-bottom:1px solid #F6F4FC;color:#2F2A3E}
</style></head><body>
<div class="bar"><div class="row"><input id="q" placeholder="Cari alamat / tempat..."/><button id="go">Cari</button></div><div id="addr"></div></div>
<div id="res" style="display:none"></div>
<div id="map"></div>
<div class="cf"><button id="pick">Pilih lokasi ini</button></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var cur={lat:${lat},lng:${lng},address:${a}};
  var map=L.map('map',{zoomControl:true,attributionControl:false}).setView([cur.lat,cur.lng],15);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  var marker=L.marker([cur.lat,cur.lng],{draggable:true}).addTo(map);
  var addrEl=document.getElementById('addr'); addrEl.textContent=cur.address||'Geser pin atau cari alamat';
  function setAddr(t){ cur.address=t||''; addrEl.textContent=t||('Lat '+cur.lat.toFixed(5)+', Lng '+cur.lng.toFixed(5)); }
  function reverse(){ fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat='+cur.lat+'&lon='+cur.lng).then(function(r){return r.json()}).then(function(j){ if(j&&j.display_name) setAddr(j.display_name); }).catch(function(){}); }
  function moveTo(lat,lng,addr,zoom){ cur.lat=lat;cur.lng=lng;marker.setLatLng([lat,lng]);map.setView([lat,lng],zoom||map.getZoom()); if(addr){setAddr(addr)}else{reverse()} }
  marker.on('dragend',function(e){ var p=e.target.getLatLng();cur.lat=p.lat;cur.lng=p.lng;reverse(); });
  map.on('click',function(e){ moveTo(e.latlng.lat,e.latlng.lng); });
  var resEl=document.getElementById('res');
  function doSearch(){ var q=document.getElementById('q').value.trim(); if(!q)return;
    fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&q='+encodeURIComponent(q)).then(function(r){return r.json()}).then(function(list){
      resEl.innerHTML=''; if(!list||!list.length){resEl.style.display='none';return}
      list.forEach(function(it){ var d=document.createElement('div'); d.textContent=it.display_name; d.onclick=function(){ resEl.style.display='none'; document.getElementById('q').value=''; moveTo(parseFloat(it.lat),parseFloat(it.lon),it.display_name,16); }; resEl.appendChild(d); });
      resEl.style.display='block';
    }).catch(function(){ resEl.style.display='none'; }); }
  document.getElementById('go').onclick=doSearch;
  document.getElementById('q').addEventListener('keyup',function(e){ if(e.key==='Enter')doSearch(); });
  document.getElementById('pick').onclick=function(){ window.ReactNativeWebView.postMessage(JSON.stringify({type:'pick',lat:cur.lat,lng:cur.lng,address:cur.address})); };
</script></body></html>`;
}

export function LocationPickerModal({
  visible,
  initial,
  onSelect,
  onClose,
}: {
  visible: boolean;
  initial: { lat: number | null; lng: number | null; address: string };
  onSelect: (loc: PickedLocation) => void;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const lat = initial.lat ?? -6.2088;
  const lng = initial.lng ?? 106.8456;
  const useGoogle = GOOGLE_MAPS_API_KEY.length > 0;
  const html = useGoogle ? buildHtmlGoogle(lat, lng, initial.address, GOOGLE_MAPS_API_KEY) : buildHtmlOSM(lat, lng, initial.address);
  // baseUrl = origin web (referrer) agar key Google web bisa dipakai ulang bila
  // referrer tsb diizinkan di Google Cloud Console.
  const source = useGoogle ? { html, baseUrl: `${API_BASE_URL}/` } : { html };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
          <Pressable onPress={onClose} hitSlop={10}><Icon name="close" size={20} color={colors.neutral[700]} strokeWidth={2.2} /></Pressable>
          <Txt size={15} weight="extrabold" color={colors.neutral[900]}>Pilih Lokasi</Txt>
          <View style={{ width: 20 }} />
        </View>
        {visible ? (
          <WebView
            originWhitelist={["*"]}
            source={source}
            style={{ flex: 1 }}
            javaScriptEnabled
            domStorageEnabled
            androidLayerType="hardware"
            onMessage={(e) => {
              try {
                const m = JSON.parse(e.nativeEvent.data);
                if (m?.type === "pick" && typeof m.lat === "number" && typeof m.lng === "number") {
                  onSelect({ lat: m.lat, lng: m.lng, address: typeof m.address === "string" ? m.address : "" });
                }
              } catch { /* ignore */ }
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
