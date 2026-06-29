// Render konten HTML (rich text pengumuman) di RN via WebView — tinggi otomatis,
// gaya selaras app, link dibuka di browser. TANPA dependensi parser HTML.
import { useState } from "react";
import { Linking, Platform } from "react-native";
import { WebView } from "react-native-webview";
import { colors, fonts } from "@/theme/tokens";

function buildHtml(content: string): string {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"/>
<style>
  :root { color-scheme: light; }
  html,body { margin:0; padding:0; background:transparent; }
  body {
    font-family: -apple-system, "Helvetica Neue", Roboto, Arial, sans-serif;
    font-size: 14px; line-height: 1.65; color: ${colors.neutral[700]};
    -webkit-text-size-adjust: 100%; word-wrap: break-word; overflow-wrap: break-word;
  }
  h1 { font-size: 20px; } h2 { font-size: 17px; }
  h1,h2,h3 { color: ${colors.neutral[900]}; font-weight: 800; line-height: 1.3; margin: 14px 0 6px; }
  p { margin: 0 0 10px; }
  ul,ol { margin: 0 0 10px; padding-left: 22px; }
  li { margin-bottom: 4px; }
  a { color: ${colors.brand[600]}; text-decoration: none; }
  blockquote { margin: 10px 0; padding: 6px 12px; border-left: 3px solid ${colors.brand[300]};
    background: ${colors.neutral[50]}; border-radius: 6px; color: ${colors.neutral[600]}; }
  img { max-width: 100%; height: auto; border-radius: 10px; }
  strong,b { font-weight: 800; color: ${colors.neutral[900]}; }
  hr { border: none; border-top: 1px solid ${colors.neutral[100]}; margin: 14px 0; }
  *:first-child { margin-top: 0; } *:last-child { margin-bottom: 0; }
</style></head><body>
<div id="c">${content}</div>
<script>
  function post(){ var h=document.getElementById('c').scrollHeight; window.ReactNativeWebView.postMessage(String(h)); }
  window.addEventListener('load', post);
  setTimeout(post, 60); setTimeout(post, 300);
  Array.prototype.forEach.call(document.images, function(im){ im.addEventListener('load', post); });
</script>
</body></html>`;
}

export function RichTextView({ content }: { content: string }) {
  const [height, setHeight] = useState(40);
  // Inline font supaya konsisten dgn Plus Jakarta? WebView pakai system font (HTML).
  void fonts;
  return (
    <WebView
      originWhitelist={["*"]}
      source={{ html: buildHtml(content || "") }}
      style={{ width: "100%", height, backgroundColor: "transparent" }}
      scrollEnabled={false}
      showsVerticalScrollIndicator={false}
      javaScriptEnabled
      domStorageEnabled
      androidLayerType="hardware"
      onMessage={(e) => {
        const h = Number(e.nativeEvent.data);
        if (Number.isFinite(h) && h > 0) setHeight(Math.ceil(h) + 4);
      }}
      onShouldStartLoadWithRequest={(reqEvent) => {
        // Muat HTML awal; klik link → buka di browser eksternal.
        if (reqEvent.url === "about:blank" || reqEvent.url.startsWith("data:") || reqEvent.url.startsWith("file:")) {
          return true;
        }
        if (Platform.OS === "ios" && reqEvent.navigationType === "click") {
          Linking.openURL(reqEvent.url); return false;
        }
        if (/^https?:\/\//.test(reqEvent.url)) {
          Linking.openURL(reqEvent.url); return false;
        }
        return true;
      }}
    />
  );
}
