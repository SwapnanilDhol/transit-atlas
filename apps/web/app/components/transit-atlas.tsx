"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  BusFront,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Construction,
  Languages,
  Map,
  Menu,
  Search,
  TrainFront,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { TransitMap } from "./transit-map";

type Station = {
  id: string;
  name: string;
  lineIds: string[];
};

type NetworkData = {
  stations: Station[];
};

type ServiceDayType = "weekday" | "saturday" | "sunday-holiday";

type FrequencyPattern = {
  lineId: string;
  dayType: ServiceDayType;
  directions: Array<{
    originPlaceId: string;
    firstDepartureTime: string;
    lastDepartureTime: string;
  }>;
  headwayBands: Array<{
    startTime: string;
    endTime: string;
    headwaySeconds: number;
  }>;
};

type ServicePatternBundle = {
  patterns: FrequencyPattern[];
};

type TransitMode = "metro" | "bus";

type BusRoute = {
  id: string;
  shortName: string;
  name: string;
  originStopId: string;
  destinationStopId: string;
  orderedStopIds: string[];
};

type BusStop = {
  id: string;
  name: string;
  routeIds: string[];
  location: null | { latitude: number; longitude: number };
};

type BusNetworkData = {
  operator: { name: string; shortName: string };
  routes: BusRoute[];
  stops: BusStop[];
};

type BusStopMatchReport = {
  osmNamedStopCount: number;
  mtcMatchedStopCount: number;
};

type Line = {
  id: string;
  sourceId?: string;
  label: string;
  corridor: string;
  detail: string;
  color: string;
  status: "Open" | "Building";
  stations: number;
  description: string;
};

const lines: Line[] = [
  {
    id: "blue",
    sourceId: "cmrl-blue",
    label: "Blue line",
    corridor: "Corridor 1",
    detail: "Wimco Nagar Depot · Airport",
    color: "#1683ff",
    status: "Open",
    stations: 26,
    description: "North Chennai to the airport through Central, Anna Salai and Guindy.",
  },
  {
    id: "green",
    sourceId: "cmrl-green",
    label: "Green line",
    corridor: "Corridor 2",
    detail: "Central · St. Thomas Mount",
    color: "#20b875",
    status: "Open",
    stations: 17,
    description: "Central Chennai to St. Thomas Mount through Anna Nagar and Koyambedu.",
  },
  {
    id: "purple",
    label: "Purple line",
    corridor: "Corridor 3",
    detail: "Madhavaram · SIPCOT",
    color: "#8f68ff",
    status: "Building",
    stations: 50,
    description: "A future north–south spine connecting Madhavaram, Mylapore, OMR and SIPCOT.",
  },
  {
    id: "yellow",
    label: "Yellow line",
    corridor: "Corridor 4",
    detail: "Lighthouse · Poonamallee",
    color: "#e4b92f",
    status: "Building",
    stations: 30,
    description: "An east–west connection from the Marina to Porur and Poonamallee.",
  },
  {
    id: "red",
    label: "Red line",
    corridor: "Corridor 5",
    detail: "Madhavaram · Sholinganallur",
    color: "#ff5c5c",
    status: "Building",
    stations: 48,
    description: "A wide orbital link across the western and southern parts of Chennai.",
  },
];

const visibleLayers = ["operational", "under-construction", "proposed"];

export function TransitAtlas() {
  const reduceMotion = useReducedMotion();
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [transitMode, setTransitMode] = useState<TransitMode>("metro");
  const [selectedBusRoute, setSelectedBusRoute] = useState<string | null>(null);
  const [network, setNetwork] = useState<NetworkData | null>(null);
  const [schedule, setSchedule] = useState<ServicePatternBundle | null>(null);
  const [busNetwork, setBusNetwork] = useState<BusNetworkData | null>(null);
  const [busStopReport, setBusStopReport] = useState<BusStopMatchReport | null>(null);

  useEffect(() => {
    fetch("/data/in-maa/modes/metro/network.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: NetworkData | null) => setNetwork(data))
      .catch(() => setNetwork(null));
    fetch("/data/in-maa/modes/metro/service-patterns.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: ServicePatternBundle | null) => setSchedule(data))
      .catch(() => setSchedule(null));
    fetch("/data/in-maa/modes/bus/network.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: BusNetworkData | null) => setBusNetwork(data))
      .catch(() => setBusNetwork(null));
    fetch("/data/in-maa/modes/bus/stop-matches.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: BusStopMatchReport | null) => setBusStopReport(data))
      .catch(() => setBusStopReport(null));
  }, []);

  const changeTransitMode = (mode: TransitMode) => {
    setTransitMode(mode);
    setSelectedLine(null);
    setSelectedBusRoute(null);
  };

  const activeBusRoute = busNetwork?.routes.find((route) => route.id === selectedBusRoute);

  return (
    <main className="h-dvh min-h-[620px] overflow-hidden bg-[#d8ded9] text-[#14221f] lg:grid lg:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="z-20 hidden h-full min-h-0 flex-col border-r border-black/8 bg-[#f8f5ee] lg:flex">
        <PanelContent
          selectedLine={selectedLine}
          onSelectLine={setSelectedLine}
          network={network}
          schedule={schedule}
          transitMode={transitMode}
          onTransitModeChange={changeTransitMode}
          busNetwork={busNetwork}
          busStopReport={busStopReport}
          selectedBusRoute={selectedBusRoute}
          onSelectBusRoute={setSelectedBusRoute}
        />
      </aside>

      <section className="relative h-full min-h-0 overflow-hidden bg-[#dce2de] lg:m-3 lg:ml-0 lg:h-[calc(100dvh-24px)] lg:rounded-[30px] lg:border lg:border-black/8 lg:shadow-[0_24px_70px_rgba(27,45,39,0.13)]">
        <div className="absolute inset-0 z-0">
          <TransitMap
            activeLayers={visibleLayers}
            selectedLine={transitMode === "metro" ? selectedLine : null}
            mode={transitMode}
            selectedBusRoute={selectedBusRoute}
          />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_44%,transparent_0%,transparent_34%,rgba(7,17,15,0.07)_100%)]" />
        </div>

        <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3 sm:p-5">
          <motion.a
            href="#"
            className="pointer-events-auto flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#09110f]/94 px-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:hidden"
            initial={reduceMotion ? false : { opacity: 0, transform: "translateY(-8px)" }}
            animate={{ opacity: 1, transform: "translateY(0px)" }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          >
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-[-0.035em]">Transit Atlas</span>
          </motion.a>

          <div className="pointer-events-auto ml-auto flex items-center gap-2">
            <div className="hidden rounded-xl border border-black/8 bg-[#f8f5ee]/92 px-3.5 py-2.5 text-xs font-medium text-[#42514c] shadow-sm backdrop-blur-xl lg:block">
              {transitMode === "bus"
                ? activeBusRoute
                  ? `MTC ${activeBusRoute.shortName} selected`
                  : `Browse ${busNetwork?.routes.length ?? "…"} MTC routes`
                : selectedLine
                ? `${lines.find((line) => line.id === selectedLine)?.label} selected`
                : "Select a line to explore"}
            </div>
            <button className="pressable hidden h-11 items-center gap-2 rounded-xl border border-black/8 bg-[#f8f5ee]/92 px-3.5 text-sm font-medium text-[#11201c] shadow-sm backdrop-blur-xl sm:flex">
              <Languages size={15} />
              EN
              <ChevronDown size={13} className="opacity-45" />
            </button>
            <button
              className="pressable grid size-11 place-items-center rounded-xl border border-black/8 bg-[#f8f5ee]/92 text-[#11201c] shadow-sm backdrop-blur-xl lg:hidden"
              onClick={() => setMobilePanelOpen(true)}
              aria-label="Open network panel"
            >
              <Menu size={18} />
            </button>
          </div>
        </header>

        {transitMode === "bus" && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden items-center gap-4 rounded-xl border border-black/8 bg-[#f8f5ee]/92 px-3.5 py-2.5 text-[9px] font-medium text-[#42514c] shadow-sm backdrop-blur-xl lg:flex">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#78972c] ring-1 ring-white" /> Linked to MTC</span>
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#d5a447] ring-1 ring-white" /> OSM stop</span>
            <span className="font-mono text-black/35">{busStopReport?.osmNamedStopCount.toLocaleString("en-IN") ?? "…"} mapped</span>
          </div>
        )}

        <div className="absolute left-3 right-3 top-[76px] z-20 lg:hidden">
          <button
            className="pressable flex h-12 w-full items-center gap-3 rounded-2xl border border-black/8 bg-[#f9f6ef]/96 px-4 text-left text-[#14221f] shadow-[0_14px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl"
            onClick={() => setMobilePanelOpen(true)}
          >
            <Search size={17} className="text-[#66716e]" />
            <span className="text-sm font-medium text-[#66716e]">{transitMode === "bus" ? "Find an MTC bus route" : "Find a station or line"}</span>
            <span className="ml-auto rounded-lg bg-[#e8ece8] px-2 py-1 font-mono text-[10px] font-semibold text-[#66716e]">{transitMode === "bus" ? busNetwork?.routes.length ?? "…" : 41}</span>
          </button>
        </div>

        <AnimatePresence>
          {mobilePanelOpen && (
            <>
              <motion.button
                className="absolute inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.14 }}
                onClick={() => setMobilePanelOpen(false)}
                aria-label="Close panel"
              />
              <motion.aside
                className="absolute inset-x-2 bottom-2 z-50 flex max-h-[86dvh] flex-col overflow-hidden rounded-[28px] border border-black/10 bg-[#f8f5ee] text-[#14221f] shadow-[0_28px_80px_rgba(0,0,0,0.28)] lg:hidden"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(100%)" }}
                animate={{ opacity: 1, transform: "translateY(0%)" }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(100%)" }}
                transition={{ type: "spring", duration: 0.4, bounce: 0.06 }}
              >
                <div className="flex items-center justify-between border-b border-black/8 px-5 py-3">
                  <span className="mx-auto h-1 w-10 rounded-full bg-black/15" />
                  <button
                    className="pressable absolute right-3 rounded-xl p-2 text-black/50 hover:bg-black/5"
                    onClick={() => setMobilePanelOpen(false)}
                    aria-label="Close network panel"
                  >
                    <X size={18} />
                  </button>
                </div>
                <PanelContent
                  selectedLine={selectedLine}
                  onSelectLine={setSelectedLine}
                  network={network}
                  schedule={schedule}
                  transitMode={transitMode}
                  onTransitModeChange={changeTransitMode}
                  busNetwork={busNetwork}
                  busStopReport={busStopReport}
                  selectedBusRoute={selectedBusRoute}
                  onSelectBusRoute={setSelectedBusRoute}
                  compact
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}

function BrandMark() {
  return (
    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#d8ff64] text-[#0b1512]">
      <TrainFront size={16} strokeWidth={2.4} />
    </span>
  );
}

function PanelContent({
  selectedLine,
  onSelectLine,
  network,
  schedule,
  transitMode,
  onTransitModeChange,
  busNetwork,
  busStopReport,
  selectedBusRoute,
  onSelectBusRoute,
  compact = false,
}: {
  selectedLine: string | null;
  onSelectLine: (id: string | null) => void;
  network: NetworkData | null;
  schedule: ServicePatternBundle | null;
  transitMode: TransitMode;
  onTransitModeChange: (mode: TransitMode) => void;
  busNetwork: BusNetworkData | null;
  busStopReport: BusStopMatchReport | null;
  selectedBusRoute: string | null;
  onSelectBusRoute: (id: string | null) => void;
  compact?: boolean;
}) {
  const selected = lines.find((line) => line.id === selectedLine) ?? null;
  const sourceLineId = selected?.sourceId;
  const selectedStations = sourceLineId
    ? network?.stations.filter((station) => station.lineIds.includes(sourceLineId)) ?? []
    : [];

  return (
    <>
      <div className="border-b border-black/8 px-5 pb-5 pt-5">
        {!compact && (
          <div className="mb-6 flex items-center gap-3">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-[-0.035em]">Transit Atlas</span>
            <span className="rounded-md border border-black/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-black/42">Local</span>
          </div>
        )}
        <button className="pressable mb-3 flex items-center gap-2 rounded-xl border border-black/8 bg-white/65 px-3 py-2 text-xs font-medium text-[#364641] hover:bg-white">
          <span className="text-base leading-none">🇮🇳</span>
          Chennai, India
          <ChevronDown size={13} className="ml-1 opacity-50" />
        </button>
        <ModeSwitcher mode={transitMode} onChange={onTransitModeChange} />
        {transitMode === "metro" && selected ? (
          <button
            className="pressable -ml-2 mt-3 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#52605c] hover:bg-black/[0.045] hover:text-[#14221f]"
            onClick={() => onSelectLine(null)}
          >
            <ArrowLeft size={15} />
            All Chennai lines
          </button>
        ) : transitMode === "bus" && selectedBusRoute ? (
          <button
            className="pressable -ml-2 mt-3 flex items-center gap-2 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#52605c] hover:bg-black/[0.045] hover:text-[#14221f]"
            onClick={() => onSelectBusRoute(null)}
          >
            <ArrowLeft size={15} />
            All MTC routes
          </button>
        ) : (
          <>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#587014]">{transitMode === "bus" ? "MTC directory" : "Living network"}</p>
                <h1 className="text-[30px] font-semibold leading-[1.04] tracking-[-0.055em]">{transitMode === "bus" ? <>Chennai<br />by bus.</> : <>Chennai<br />in motion.</>}</h1>
              </div>
              <div className="mb-1 flex items-center gap-1.5 rounded-full border border-[#78972c]/20 bg-[#d8ff64]/45 px-2.5 py-1.5 text-[10px] font-semibold text-[#43590c]">
                <span className="size-1.5 rounded-full bg-[#67821d]" />
                {transitMode === "bus" ? `${busNetwork?.routes.length ?? "…"} routes` : "2 open"}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-3">
        {transitMode === "bus" ? (
          <BusNetworkPanel
            data={busNetwork}
            report={busStopReport}
            selectedRouteId={selectedBusRoute}
            onSelectRoute={onSelectBusRoute}
          />
        ) : (
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.section key={selected.id} initial={{ opacity: 0, transform: "translateX(8px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}>
              <div className="px-2 pb-4 pt-1">
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-black/8">
                    <span className="size-4 rounded-full" style={{ background: selected.color }} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/38">{selected.corridor}</p>
                    <h2 className="truncate text-xl font-semibold tracking-[-0.04em]">{selected.label}</h2>
                  </div>
                  <span className={`ml-auto rounded-lg px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] ${selected.status === "Open" ? "bg-[#d8ff64]/55 text-[#43590c]" : "bg-black/[0.055] text-black/45"}`}>{selected.status}</span>
                </div>
                <p className="text-[11px] leading-[1.55] text-black/52">{selected.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Metric label="Stations" value={String(selected.stations)} />
                  <Metric label="Status" value={selected.status} accent={selected.color} />
                </div>
              </div>

              {selected.sourceId && (
                <Timetable
                  lineId={selected.sourceId}
                  schedule={schedule}
                  accent={selected.color}
                />
              )}

              <div className="mb-2 flex items-center justify-between border-t border-black/8 px-2 pt-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Stations</span>
                <span className="text-[10px] text-black/35">{selectedStations.length ? `${selectedStations.length} mapped` : "Awaiting geometry"}</span>
              </div>
              {selectedStations.length > 0 ? (
                <div className="pb-3">
                  {selectedStations.map((station, index) => (
                    <div key={station.id} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5">
                      <span className="relative grid size-6 shrink-0 place-items-center">
                        {index > 0 && <span className="absolute bottom-1/2 left-[11px] h-5 w-0.5" style={{ background: selected.color }} />}
                        {index < selectedStations.length - 1 && <span className="absolute left-[11px] top-1/2 h-5 w-0.5" style={{ background: selected.color }} />}
                        <span className="relative size-2.5 rounded-full border-2 border-[#f8f5ee]" style={{ background: selected.color, boxShadow: `0 0 0 1px ${selected.color}` }} />
                      </span>
                      <span className="truncate text-xs font-medium text-[#34443f]">{station.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mx-1 rounded-2xl border border-[#b78a18]/15 bg-[#f1c84c]/10 px-3.5 py-3 text-[10px] leading-4 text-[#705711]">
                  Verified Phase II station geometry is not in the local dataset yet, so the map will not invent an alignment.
                </div>
              )}
            </motion.section>
          ) : (
            <motion.section key="network" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">The network</span>
                <span className="text-[10px] text-black/35">Choose a line</span>
              </div>
              <div className="space-y-1">
                {lines.map((line) => (
                  <button key={line.id} onClick={() => onSelectLine(line.id)} className="pressable group flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 text-left hover:border-black/[0.055] hover:bg-white/65">
                    <span className="relative flex h-10 w-5 shrink-0 justify-center">
                      <span className="absolute inset-y-0 w-[3px] rounded-full" style={{ background: line.color }} />
                      <span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#f8f5ee]" style={{ background: line.color, boxShadow: `0 0 0 1px ${line.color}` }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-[13px] font-semibold tracking-[-0.02em] text-[#22312d]">{line.label}</span>
                        <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${line.status === "Open" ? "bg-[#d8ff64]/55 text-[#43590c]" : "bg-black/[0.05] text-black/38"}`}>{line.status}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] text-black/42">{line.detail}</span>
                    </span>
                    <ChevronRight size={15} className="text-black/22 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-black/55" />
                  </button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-black/8 p-3">
        <button className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-black/[0.045] py-2.5 text-[11px] font-medium text-black/62 hover:bg-black/[0.07] hover:text-black/85">
          <Map size={14} /> Explore
        </button>
        <button className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-medium text-black/38 hover:bg-black/[0.04] hover:text-black/65">
          <Construction size={14} /> Projects
        </button>
        <button className="pressable grid size-9 place-items-center rounded-xl text-black/35 hover:bg-black/[0.04] hover:text-black/65" aria-label="About this data">
          <CircleHelp size={15} />
        </button>
      </div>
    </>
  );
}

function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: TransitMode;
  onChange: (mode: TransitMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 rounded-xl bg-black/[0.045] p-1" role="tablist" aria-label="Transport mode">
      {([
        { id: "metro" as const, label: "Metro", icon: TrainFront },
        { id: "bus" as const, label: "Bus", icon: BusFront },
      ]).map((item) => {
        const Icon = item.icon;
        const active = mode === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={`pressable flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[11px] font-semibold ${active ? "bg-white text-[#1f302b] shadow-sm" : "text-black/42 hover:text-black/65"}`}
          >
            <Icon size={14} strokeWidth={2.2} />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function readableStopName(name: string) {
  return name
    .toLocaleLowerCase("en-IN")
    .replace(/(^|[\s/.-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-IN"));
}

function BusNetworkPanel({
  data,
  report,
  selectedRouteId,
  onSelectRoute,
}: {
  data: BusNetworkData | null;
  report: BusStopMatchReport | null;
  selectedRouteId: string | null;
  onSelectRoute: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(60);
  const stopById = useMemo(
    () => new globalThis.Map(data?.stops.map((stop) => [stop.id, stop]) ?? []),
    [data],
  );
  const selectedRoute = data?.routes.find((route) => route.id === selectedRouteId) ?? null;
  const normalizedQuery = query.trim().toLocaleLowerCase("en-IN");
  const matchingRoutes = useMemo(() => {
    if (!data) return [];
    if (!normalizedQuery) return data.routes;
    return data.routes
      .filter((route) =>
        `${route.shortName} ${route.name}`.toLocaleLowerCase("en-IN").includes(normalizedQuery),
      )
      .sort((a, b) => {
        const aExact = a.shortName.toLocaleLowerCase("en-IN") === normalizedQuery;
        const bExact = b.shortName.toLocaleLowerCase("en-IN") === normalizedQuery;
        return Number(bExact) - Number(aExact);
      });
  }, [data, normalizedQuery]);

  if (!data) {
    return <div className="rounded-2xl bg-black/[0.035] px-4 py-8 text-center text-[11px] text-black/38">Loading the MTC route directory…</div>;
  }

  if (selectedRoute) {
    const routeStops = selectedRoute.orderedStopIds
      .map((id) => stopById.get(id))
      .filter((stop): stop is BusStop => Boolean(stop));
    const mappedStops = routeStops.filter((stop) => stop.location);

    return (
      <motion.section initial={{ opacity: 0, transform: "translateX(8px)" }} animate={{ opacity: 1, transform: "translateX(0px)" }} transition={{ duration: 0.16 }}>
        <div className="px-2 pb-4 pt-1">
          <div className="mb-4 flex items-center gap-3">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#d8ff64] text-[#26360c] shadow-sm ring-1 ring-black/8">
              <span className="font-mono text-[12px] font-bold">{selectedRoute.shortName}</span>
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-black/38">MTC bus route</p>
              <h2 className="truncate text-lg font-semibold tracking-[-0.035em]">{selectedRoute.shortName}</h2>
            </div>
            <span className="ml-auto rounded-lg bg-[#d8ff64]/55 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#43590c]">Open</span>
          </div>
          <p className="text-[12px] font-medium leading-[1.5] text-[#34443f]">{readableStopName(selectedRoute.name)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Metric label="Stops" value={String(routeStops.length)} />
            <Metric label="Mapped" value={`${mappedStops.length}/${routeStops.length}`} accent="#587014" />
          </div>
          <div className={`mt-3 rounded-xl border px-3.5 py-3 text-[10px] leading-4 ${mappedStops.length ? "border-[#78972c]/15 bg-[#d8ff64]/15 text-[#4a5f18]" : "border-[#b78a18]/15 bg-[#f1c84c]/10 text-[#705711]"}`}>
            {mappedStops.length
              ? `${mappedStops.length} route stops were confidently matched to OpenStreetMap and are highlighted. The route line is withheld until verified geometry is available.`
              : "No route stops could be confidently matched to OpenStreetMap yet. The map will not guess their positions."}
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between border-t border-black/8 px-2 pt-4">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">Stops</span>
          <span className="text-[10px] text-black/35">In route order</span>
        </div>
        <div className="pb-3">
          {routeStops.map((stop, index) => (
            <div key={`${stop.id}-${index}`} className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5">
              <span className="relative grid size-6 shrink-0 place-items-center">
                {index > 0 && <span className="absolute bottom-1/2 left-[11px] h-5 w-0.5 bg-black/12" />}
                {index < routeStops.length - 1 && <span className="absolute left-[11px] top-1/2 h-5 w-0.5 bg-black/12" />}
                <span className={`relative size-2.5 rounded-full border-2 border-[#f8f5ee] ${stop.location ? "bg-[#78972c] shadow-[0_0_0_1px_#78972c]" : "bg-black/20 shadow-[0_0_0_1px_rgb(0_0_0/0.18)]"}`} />
              </span>
              <span className="min-w-0 truncate text-xs font-medium text-[#34443f]">{readableStopName(stop.name)}</span>
              {stop.location && <span className="ml-auto font-mono text-[8px] uppercase tracking-[0.08em] text-[#66801e]">Mapped</span>}
            </div>
          ))}
        </div>
      </motion.section>
    );
  }

  const shownRoutes = matchingRoutes.slice(0, visibleCount);

  return (
    <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.12 }}>
      <label className="mb-3 flex h-11 items-center gap-3 rounded-xl border border-black/8 bg-white/65 px-3.5 text-black/55 focus-within:border-black/20 focus-within:bg-white">
        <Search size={16} className="shrink-0" />
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setVisibleCount(60);
          }}
          placeholder="Route number or destination"
          className="min-w-0 flex-1 bg-transparent text-xs text-[#263631] outline-none placeholder:text-black/35"
          aria-label="Search MTC routes"
        />
        {query && <button onClick={() => { setQuery(""); setVisibleCount(60); }} aria-label="Clear route search"><X size={14} /></button>}
      </label>
      <div className="mb-2 flex items-center justify-between px-2">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/40">MTC routes</span>
        <span className="text-[10px] text-black/35">{matchingRoutes.length.toLocaleString("en-IN")} found</span>
      </div>
      {report && !query && (
        <div className="mx-1 mb-3 grid grid-cols-2 gap-2">
          <Metric label="OSM points" value={report.osmNamedStopCount.toLocaleString("en-IN")} />
          <Metric label="MTC linked" value={report.mtcMatchedStopCount.toLocaleString("en-IN")} accent="#587014" />
        </div>
      )}
      <div className="space-y-1">
        {shownRoutes.map((route) => (
          <button key={route.id} onClick={() => onSelectRoute(route.id)} className="pressable group flex w-full items-center gap-3 rounded-2xl border border-transparent px-2 py-2.5 text-left hover:border-black/[0.055] hover:bg-white/65">
            <span className="grid h-10 min-w-12 shrink-0 place-items-center rounded-xl bg-[#d8ff64]/55 px-2 font-mono text-[10px] font-bold text-[#43590c] ring-1 ring-[#78972c]/15">{route.shortName}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[11px] font-semibold tracking-[-0.01em] text-[#22312d]">{readableStopName(route.name)}</span>
              <span className="mt-0.5 block text-[9px] text-black/38">{route.orderedStopIds.length} stops</span>
            </span>
            <ChevronRight size={15} className="text-black/22 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-black/55" />
          </button>
        ))}
      </div>
      {shownRoutes.length === 0 && (
        <div className="rounded-2xl bg-black/[0.035] px-4 py-8 text-center text-[11px] text-black/38">No routes match “{query}”.</div>
      )}
      {visibleCount < matchingRoutes.length && (
        <button onClick={() => setVisibleCount((count) => count + 60)} className="pressable mt-3 w-full rounded-xl border border-black/8 bg-white/55 py-3 text-[10px] font-semibold text-black/55 hover:bg-white">Show more routes</button>
      )}
    </motion.section>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-black/[0.07] bg-white/65 px-3 py-2.5">
      <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-black/36">{label}</span>
      <span className="mt-1 block text-sm font-semibold" style={accent ? { color: accent } : undefined}>{value}</span>
    </div>
  );
}

const dayOptions: Array<{ id: ServiceDayType; label: string }> = [
  { id: "weekday", label: "Weekday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday-holiday", label: "Sun / holiday" },
];

const terminusNames: Record<string, string> = {
  "in-maa-cmrl-wimco-nagar-depot-metro": "Wimco Nagar Depot",
  "in-maa-cmrl-chennai-international-airport": "Airport",
  "in-maa-cmrl-puratchi-thalaivar-dr-m-g-ramachandran-central-metro": "Chennai Central",
  "in-maa-cmrl-st-thomas-mount-metro": "St. Thomas Mount",
};

function currentServiceDay(): ServiceDayType {
  const weekday = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(new Date());
  return weekday === "Sun" ? "sunday-holiday" : weekday === "Sat" ? "saturday" : "weekday";
}

function Timetable({
  lineId,
  schedule,
  accent,
}: {
  lineId: string;
  schedule: ServicePatternBundle | null;
  accent: string;
}) {
  const [dayType, setDayType] = useState<ServiceDayType>(currentServiceDay);
  const pattern = schedule?.patterns.find(
    (item) => item.lineId === lineId && item.dayType === dayType,
  );

  const groupedHeadways = pattern?.headwayBands.reduce<Array<{
    headwaySeconds: number;
    ranges: string[];
  }>>((groups, band) => {
    const existing = groups.find((group) => group.headwaySeconds === band.headwaySeconds);
    const range = `${band.startTime}–${band.endTime}`;
    if (existing) existing.ranges.push(range);
    else groups.push({ headwaySeconds: band.headwaySeconds, ranges: [range] });
    return groups;
  }, []);

  return (
    <section className="border-t border-black/8 px-2 py-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/42">Timetable</p>
          <p className="mt-0.5 text-[10px] text-black/38">Official CMRL schedule</p>
        </div>
        <span className="rounded-md bg-black/[0.045] px-2 py-1 text-[9px] font-semibold text-black/45">Local time</span>
      </div>

      <div className="mb-3 grid grid-cols-3 rounded-xl bg-black/[0.045] p-1">
        {dayOptions.map((day) => (
          <button
            key={day.id}
            onClick={() => setDayType(day.id)}
            aria-pressed={dayType === day.id}
            className={`pressable rounded-lg px-1 py-2 text-[9px] font-semibold ${
              dayType === day.id
                ? "bg-white text-[#1f302b] shadow-sm"
                : "text-black/42 hover:text-black/65"
            }`}
          >
            {day.label}
          </button>
        ))}
      </div>

      {pattern ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-black/[0.07] bg-white/55">
            <div className="grid grid-cols-[1fr_52px_52px] border-b border-black/[0.06] px-3 py-2 font-mono text-[8px] uppercase tracking-[0.1em] text-black/34">
              <span>From</span><span>First</span><span>Last</span>
            </div>
            {pattern.directions.map((direction) => (
              <div key={direction.originPlaceId} className="grid grid-cols-[1fr_52px_52px] items-center border-b border-black/[0.05] px-3 py-2.5 text-[10px] last:border-b-0">
                <span className="truncate pr-2 font-medium text-[#34443f]">{terminusNames[direction.originPlaceId] ?? "Terminus"}</span>
                <span className="font-mono text-black/58">{direction.firstDepartureTime}</span>
                <span className="font-mono text-black/58">{direction.lastDepartureTime}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            {groupedHeadways?.map((group) => (
              <div key={group.headwaySeconds} className="flex items-center gap-3 rounded-xl bg-white/45 px-3 py-2.5 ring-1 ring-black/[0.055]">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg font-mono text-[11px] font-bold text-white" style={{ background: accent }}>
                  {group.headwaySeconds / 60}m
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-semibold text-[#34443f]">Every {group.headwaySeconds / 60} minutes</span>
                  <span className="mt-0.5 block text-[9px] leading-4 text-black/38">{group.ranges.join(" · ")}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="px-1 text-[9px] leading-4 text-black/34">Published headways; actual arrivals can vary.</p>
        </div>
      ) : (
        <div className="rounded-xl bg-black/[0.035] px-3 py-4 text-center text-[10px] text-black/38">Loading timetable…</div>
      )}
    </section>
  );
}
