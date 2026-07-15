"use client";

import { useEffect, useRef, useState } from "react";
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

type TransitMapProps = {
  activeLayers: string[];
  onReady?: () => void;
};

const lineColors: Record<string, string> = {
  blue: "#1683ff",
  green: "#20b875",
  purple: "#8f68ff",
  yellow: "#f1c84c",
  red: "#ff5c5c",
};

export function TransitMap({ activeLayers, onReady }: TransitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [hasNetwork, setHasNetwork] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function createMap() {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center: [80.235, 13.055],
        zoom: 10.45,
        minZoom: 8,
        maxZoom: 18,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({ compact: true }),
        "bottom-right",
      );

      map.on("load", async () => {
      onReady?.();

      try {
        const response = await fetch("/data/in-maa/network.geojson");
        if (!response.ok) return;
        const data = (await response.json()) as GeoJSON.FeatureCollection;

        map.addSource("transit-network", {
          type: "geojson",
          data,
        });

        map.addLayer({
          id: "transit-lines-halo",
          type: "line",
          source: "transit-network",
          filter: ["==", ["geometry-type"], "LineString"],
          paint: {
            "line-color": "#07110f",
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 5, 14, 10],
            "line-opacity": 0.88,
          },
        });

        map.addLayer({
          id: "transit-lines",
          type: "line",
          source: "transit-network",
          filter: ["==", ["geometry-type"], "LineString"],
          paint: {
            "line-color": [
              "match",
              ["get", "line"],
              "blue",
              lineColors.blue,
              "green",
              lineColors.green,
              "purple",
              lineColors.purple,
              "yellow",
              lineColors.yellow,
              "red",
              lineColors.red,
              "#b4c0bd",
            ],
            "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.4, 14, 5],
            "line-opacity": 0.96,
            "line-dasharray": [
              "case",
              ["==", ["get", "status"], "operational"],
              [1, 0],
              [2, 1.5],
            ],
          },
        });

        map.addLayer({
          id: "transit-stations",
          type: "circle",
          source: "transit-network",
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 2.5, 14, 5],
            "circle-color": "#f5f1e9",
            "circle-stroke-color": "#07110f",
            "circle-stroke-width": 1.5,
          },
        });

        setHasNetwork(true);
      } catch {
        // The basemap remains useful while the first regional bundle is built.
      }
      });

      mapRef.current = map;
    }

    void createMap();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [onReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasNetwork) return;

    const source = map.getSource("transit-network") as GeoJSONSource | undefined;
    if (!source) return;

    const statuses = activeLayers.length
      ? activeLayers
      : ["operational", "under-construction", "proposed"];

    const statusFilter: FilterSpecification = [
      "in",
      ["get", "status"],
      ["literal", statuses],
    ];

    map.setFilter("transit-lines-halo", [
      "all",
      ["==", ["geometry-type"], "LineString"],
      statusFilter,
    ]);
    map.setFilter("transit-lines", [
      "all",
      ["==", ["geometry-type"], "LineString"],
      statusFilter,
    ]);
    map.setFilter("transit-stations", [
      "all",
      ["==", ["geometry-type"], "Point"],
      statusFilter,
    ]);
  }, [activeLayers, hasNetwork]);

  return <div ref={containerRef} className="h-full w-full" aria-label="Map of Chennai Metro" />;
}
