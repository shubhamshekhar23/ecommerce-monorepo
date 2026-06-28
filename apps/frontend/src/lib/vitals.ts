import { onCLS, onFCP, onLCP, onTTFB, onINP } from "web-vitals";

function sendToGA(metric: { name: string; value: number; id: string }) {
  window.gtag?.("event", metric.name, {
    value: Math.round(
      metric.name === "CLS" ? metric.value * 1000 : metric.value,
    ),
    metric_id: metric.id,
    non_interaction: true,
  });
}

export function reportWebVitals() {
  onCLS(sendToGA);
  onFCP(sendToGA);
  onLCP(sendToGA);
  onTTFB(sendToGA);
  onINP(sendToGA);
}
