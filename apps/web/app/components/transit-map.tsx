"use client";

import { useEffect, useRef, useState } from "react";
import type {
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from "maplibre-gl";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

type TransitMapProps = {
  regionId: string;
  regionName: string;
  center: [number, number];
  zoom: number;
  hasBus: boolean;
  activeLayers: string[];
  selectedLine: string | null;
  mode: "metro" | "bus";
  selectedBusRoute: string | null;
  onReady?: () => void;
};

const lineColors: Record<string, string> = {
  blue: "#1683ff",
  green: "#20b875",
  purple: "#8f68ff",
  yellow: "#f1c84c",
  red: "#ff5c5c",
};

export function TransitMap({
  regionId,
  regionName,
  center,
  zoom,
  hasBus,
  activeLayers,
  selectedLine,
  mode,
  selectedBusRoute,
  onReady,
}: TransitMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const networkRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const busStopsRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const [hasNetwork, setHasNetwork] = useState(false);
  const [hasBusStops, setHasBusStops] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let cancelled = false;

    async function createMap() {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !containerRef.current) return;

      const map = new maplibregl.Map({
        container: containerRef.current,
        style: MAP_STYLE,
        center,
        zoom,
        minZoom: 8,
        maxZoom: 18,
        attributionControl: false,
      });

      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
      map.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution:
            'Transit data © <a href="https://www.openstreetmap.org/copyright" target="_blank">OSM contributors</a>',
        }),
        "bottom-left",
      );

      map.on("load", async () => {
        onReady?.();

        try {
          const networkResponse = await fetch(`/data/${regionId}/modes/metro/network.geojson`);
          if (!networkResponse.ok) return;
          const data = (await networkResponse.json()) as GeoJSON.FeatureCollection;
          networkRef.current = data;

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
              "line-color": "#ffffff",
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 4, 14, 8],
              "line-opacity": 0.94,
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
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 2.2, 14, 4.5],
              "line-opacity": 0.96,
              "line-dasharray": [
                "case",
                ["==", ["get", "status"], "operational"],
                ["literal", [1, 0]],
                ["literal", [2, 1.5]],
              ],
            },
          });

          map.addLayer({
            id: "transit-selected-line-halo",
            type: "line",
            source: "transit-network",
            filter: ["==", ["get", "line"], "__none__"],
            paint: {
              "line-color": "#ffffff",
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 5.5, 14, 9],
              "line-opacity": 0.96,
            },
          });

          map.addLayer({
            id: "transit-selected-line",
            type: "line",
            source: "transit-network",
            filter: ["==", ["get", "line"], "__none__"],
            paint: {
              "line-color": lineColors.blue,
              "line-width": ["interpolate", ["linear"], ["zoom"], 9, 3, 14, 5.5],
              "line-opacity": 1,
            },
          });

          map.addLayer({
            id: "transit-stations",
            type: "circle",
            source: "transit-network",
            filter: ["==", ["geometry-type"], "Point"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 1.7, 14, 4],
              "circle-color": [
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
                "#64736e",
              ],
              "circle-opacity": 0.9,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, 0.8, 14, 1.5],
            },
          });

          map.addLayer({
            id: "transit-selected-stations",
            type: "circle",
            source: "transit-network",
            filter: ["==", ["get", "id"], "__none__"],
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 3.2, 14, 6],
              "circle-color": "#ffffff",
              "circle-stroke-color": lineColors.blue,
              "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9, 1.5, 14, 2.5],
            },
          });

          if (hasBus) {
            const busStopsResponse = await fetch(`/data/${regionId}/modes/bus/stops.geojson`);
            if (busStopsResponse.ok) {
              const busStops = (await busStopsResponse.json()) as GeoJSON.FeatureCollection;
              busStopsRef.current = busStops;
              map.addSource("bus-stops", { type: "geojson", data: busStops });
              map.addLayer({
                id: "bus-stops",
                type: "circle",
                source: "bus-stops",
                minzoom: 9.8,
                layout: { visibility: "none" },
                paint: {
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 9.8, 2, 14, 4.5],
                  "circle-color": [
                    "case",
                    ["==", ["get", "matchMethod"], "unmatched"],
                    "#d5a447",
                    "#78972c",
                  ],
                  "circle-opacity": 0.76,
                  "circle-stroke-color": "#fffdf7",
                  "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9.8, 0.7, 14, 1.5],
                },
              });
              map.addLayer({
                id: "bus-selected-stops",
                type: "circle",
                source: "bus-stops",
                filter: ["==", ["get", "id"], "__none__"],
                layout: { visibility: "none" },
                paint: {
                  "circle-radius": ["interpolate", ["linear"], ["zoom"], 9.8, 4, 14, 7],
                  "circle-color": "#d8ff64",
                  "circle-stroke-color": "#33450e",
                  "circle-stroke-width": ["interpolate", ["linear"], ["zoom"], 9.8, 1.4, 14, 2.2],
                },
              });
              setHasBusStops(true);
            }
          }

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
  }, [center, hasBus, onReady, regionId, zoom]);

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

  useEffect(() => {
    const map = mapRef.current;
    const network = networkRef.current;
    if (!map || !hasNetwork || !network) return;

    if (!selectedLine) {
      map.setFilter("transit-selected-line-halo", ["==", ["get", "line"], "__none__"]);
      map.setFilter("transit-selected-line", ["==", ["get", "line"], "__none__"]);
      map.setFilter("transit-selected-stations", ["==", ["get", "id"], "__none__"]);
      map.setPaintProperty("transit-lines-halo", "line-opacity", 0.94);
      map.setPaintProperty("transit-lines", "line-opacity", 0.96);
      map.setPaintProperty("transit-stations", "circle-opacity", 0.95);
      return;
    }

    const selectedFeatures = network.features.filter((feature) => {
      const featureLines = feature.properties?.lines;
      return Array.isArray(featureLines) && featureLines.includes(selectedLine);
    });

    const selectedLineFilter: FilterSpecification = [
      "==",
      ["get", "line"],
      selectedLine,
    ];
    map.setFilter("transit-selected-line-halo", selectedLineFilter);
    map.setFilter("transit-selected-line", selectedLineFilter);
    map.setPaintProperty(
      "transit-selected-line",
      "line-color",
      lineColors[selectedLine] ?? "#d8ff64",
    );
    map.setPaintProperty("transit-lines-halo", "line-opacity", 0.08);
    map.setPaintProperty("transit-lines", "line-opacity", 0.16);

    map.setFilter("transit-selected-stations", [
      "all",
      ["==", ["geometry-type"], "Point"],
      ["in", selectedLine, ["get", "lines"]],
    ] as FilterSpecification);
    map.setPaintProperty(
      "transit-selected-stations",
      "circle-stroke-color",
      lineColors[selectedLine] ?? "#d8ff64",
    );
    map.setPaintProperty("transit-stations", "circle-opacity", 0.28);

    const coordinates = selectedFeatures.flatMap((feature) => {
      if (feature.geometry.type === "Point") return [feature.geometry.coordinates];
      if (feature.geometry.type === "LineString") return feature.geometry.coordinates;
      return [];
    });

    if (coordinates.length > 0) {
      const longitudes = coordinates.map(([longitude]) => longitude);
      const latitudes = coordinates.map(([, latitude]) => latitude);
      map.fitBounds(
        [
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ],
        { padding: 84, duration: 520, maxZoom: 12.5 },
      );
    }
  }, [hasNetwork, selectedLine]);

  useEffect(() => {
    const map = mapRef.current;
    const busStops = busStopsRef.current;
    if (!map || !hasNetwork || !hasBusStops || !busStops) return;

    const busVisibility = mode === "bus" ? "visible" : "none";
    map.setLayoutProperty("bus-stops", "visibility", busVisibility);
    map.setLayoutProperty("bus-selected-stops", "visibility", busVisibility);

    if (mode === "bus") {
      map.setPaintProperty("transit-lines-halo", "line-opacity", 0.16);
      map.setPaintProperty("transit-lines", "line-opacity", 0.24);
      map.setPaintProperty("transit-stations", "circle-opacity", 0.1);
    } else if (!selectedLine) {
      map.setPaintProperty("transit-lines-halo", "line-opacity", 0.94);
      map.setPaintProperty("transit-lines", "line-opacity", 0.96);
      map.setPaintProperty("transit-stations", "circle-opacity", 0.95);
    }

    if (mode !== "bus" || !selectedBusRoute) {
      map.setFilter("bus-selected-stops", ["==", ["get", "id"], "__none__"]);
      map.setPaintProperty("bus-stops", "circle-opacity", 0.76);
      return;
    }

    map.setFilter("bus-selected-stops", [
      "in",
      selectedBusRoute,
      ["get", "routeIds"],
    ] as FilterSpecification);
    map.setPaintProperty("bus-stops", "circle-opacity", 0.22);

    const coordinates = busStops.features
      .filter((feature) => {
        const routeIds = feature.properties?.routeIds;
        return feature.geometry.type === "Point" && Array.isArray(routeIds) && routeIds.includes(selectedBusRoute);
      })
      .map((feature) => feature.geometry)
      .filter((geometry): geometry is GeoJSON.Point => geometry.type === "Point")
      .map((geometry) => geometry.coordinates);
    if (coordinates.length > 0) {
      const longitudes = coordinates.map(([longitude]) => longitude);
      const latitudes = coordinates.map(([, latitude]) => latitude);
      map.fitBounds(
        [
          [Math.min(...longitudes), Math.min(...latitudes)],
          [Math.max(...longitudes), Math.max(...latitudes)],
        ],
        { padding: 84, duration: 520, maxZoom: 13 },
      );
    }
  }, [hasBusStops, hasNetwork, mode, selectedBusRoute, selectedLine]);

  return <div ref={containerRef} className="h-full w-full" aria-label={`Map of ${regionName} ${mode === "bus" ? "bus stops" : "Metro"}`} />;
}
