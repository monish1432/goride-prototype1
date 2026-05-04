import React, { useEffect, useRef } from "react";
import L from "leaflet";

// Fix default icon paths (we'll use custom DivIcons anyway)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = (label, kind = "pickup") =>
  L.divIcon({
    className: "",
    html: `<div class="gr-pin ${kind === "drop" ? "drop" : ""}">${label}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

export default function MapView({
  pickup,
  drop,
  worker,
  className = "h-full w-full",
  center = [12.9716, 77.5946],
  zoom = 12,
}) {
  const ref = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!ref.current || mapRef.current) return;
    mapRef.current = L.map(ref.current, {
      center,
      zoom,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap &copy; CARTO",
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) return;
    layerRef.current.clearLayers();
    const bounds = [];

    if (pickup) {
      L.marker([pickup.lat, pickup.lng], { icon: pinIcon("P", "pickup") })
        .bindPopup(`Pickup · ${pickup.address || ""}`)
        .addTo(layerRef.current);
      bounds.push([pickup.lat, pickup.lng]);
    }
    if (drop) {
      L.marker([drop.lat, drop.lng], { icon: pinIcon("D", "drop") })
        .bindPopup(`Drop · ${drop.address || ""}`)
        .addTo(layerRef.current);
      bounds.push([drop.lat, drop.lng]);
    }
    if (pickup && drop) {
      L.polyline([[pickup.lat, pickup.lng], [drop.lat, drop.lng]], {
        color: "#0A0A0A",
        weight: 4,
        dashArray: "6 8",
        opacity: 0.85,
      }).addTo(layerRef.current);
    }
    if (worker) {
      L.marker([worker.lat, worker.lng], { icon: pinIcon("🚕", "drop") })
        .bindPopup("Driver")
        .addTo(layerRef.current);
      bounds.push([worker.lat, worker.lng]);
    }

    if (bounds.length === 1) {
      mapRef.current.setView(bounds[0], 14);
    } else if (bounds.length > 1) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [pickup, drop, worker]);

  return <div data-testid="map-view" ref={ref} className={className} />;
}
