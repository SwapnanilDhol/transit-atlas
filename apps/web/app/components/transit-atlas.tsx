"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Construction,
  Languages,
  Layers3,
  Map,
  Menu,
  Search,
  Sparkles,
  TrainFront,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { TransitMap } from "./transit-map";

const lines = [
  { id: "blue", label: "Blue line", detail: "Wimco Nagar Depot · Airport", color: "#1683ff", status: "Live" },
  { id: "green", label: "Green line", detail: "Central · St. Thomas Mount", color: "#20b875", status: "Live" },
  { id: "purple", label: "Purple line", detail: "Madhavaram · SIPCOT", color: "#8f68ff", status: "Building" },
  { id: "yellow", label: "Yellow line", detail: "Lighthouse · Poonamallee", color: "#f1c84c", status: "Building" },
  { id: "red", label: "Red line", detail: "Madhavaram · Sholinganallur", color: "#ff5c5c", status: "Building" },
];

const layerOptions = [
  { id: "operational", label: "Open now", count: "2 lines" },
  { id: "under-construction", label: "Under construction", count: "3 lines" },
  { id: "proposed", label: "Proposals", count: "DPR + studies" },
];

export function TransitAtlas() {
  const reduceMotion = useReducedMotion();
  const [layersOpen, setLayersOpen] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [activeLayers, setActiveLayers] = useState([
    "operational",
    "under-construction",
    "proposed",
  ]);
  const [mapReady, setMapReady] = useState(false);

  const activeLayerLabel = useMemo(() => {
    if (activeLayers.length === layerOptions.length) return "All network";
    if (activeLayers.length === 1) {
      return layerOptions.find((layer) => layer.id === activeLayers[0])?.label ?? "Layers";
    }
    return `${activeLayers.length} layers`;
  }, [activeLayers]);

  const toggleLayer = (id: string) => {
    setActiveLayers((current) =>
      current.includes(id)
        ? current.filter((layer) => layer !== id)
        : [...current, id],
    );
  };

  const onMapReady = useCallback(() => setMapReady(true), []);

  return (
    <main className="relative h-dvh min-h-[620px] overflow-hidden bg-[#09110f] text-[#f7f2e8]">
      <div className="absolute inset-0 z-0 bg-[#dce2de]">
        <TransitMap activeLayers={activeLayers} onReady={onMapReady} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_44%,transparent_0%,transparent_30%,rgba(7,17,15,0.08)_100%)]" />
      </div>

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between p-3 sm:p-5">
        <motion.a
          href="#"
          className="pointer-events-auto flex h-12 items-center gap-3 rounded-2xl border border-white/10 bg-[#09110f]/94 px-3.5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur-xl"
          initial={reduceMotion ? false : { opacity: 0, transform: "translateY(-8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.42, ease: [0.23, 1, 0.32, 1] }}
        >
          <span className="grid size-7 place-items-center rounded-lg bg-[#d8ff64] text-[#0b1512]">
            <TrainFront size={16} strokeWidth={2.4} />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.035em]">Transit Atlas</span>
          <span className="hidden rounded-md border border-white/12 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45 sm:inline">
            Preview
          </span>
        </motion.a>

        <motion.div
          className="pointer-events-auto flex items-center gap-2"
          initial={reduceMotion ? false : { opacity: 0, transform: "translateY(-8px)" }}
          animate={{ opacity: 1, transform: "translateY(0px)" }}
          transition={{ duration: 0.42, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
        >
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
        </motion.div>
      </header>

      <aside className="absolute bottom-4 left-4 top-[88px] z-20 hidden w-[360px] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#09110f]/96 shadow-[0_28px_80px_rgba(0,0,0,0.28)] backdrop-blur-2xl lg:flex">
        <PanelContent />
      </aside>

      <div className="absolute left-3 right-3 top-[76px] z-20 lg:hidden">
        <button
          className="pressable flex h-12 w-full items-center gap-3 rounded-2xl border border-black/8 bg-[#f9f6ef]/96 px-4 text-left text-[#14221f] shadow-[0_14px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl"
          onClick={() => setMobilePanelOpen(true)}
        >
          <Search size={17} className="text-[#66716e]" />
          <span className="text-sm font-medium text-[#66716e]">Find a station, line or place</span>
          <span className="ml-auto rounded-lg bg-[#e8ece8] px-2 py-1 font-mono text-[10px] font-semibold text-[#66716e]">41 stations</span>
        </button>
      </div>

      <div className="absolute bottom-5 right-3 z-20 flex flex-col items-end gap-2 sm:right-5">
        <div className="relative">
          <AnimatePresence>
            {layersOpen && (
              <motion.div
                className="absolute bottom-[56px] right-0 w-[288px] origin-bottom-right overflow-hidden rounded-2xl border border-black/8 bg-[#f9f6ef]/98 p-2 text-[#11201c] shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-2xl"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(7px) scale(0.97)" }}
                animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(4px) scale(0.98)" }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
              >
                <div className="flex items-center justify-between px-2 pb-2 pt-1.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#66716e]">Network view</span>
                  <button onClick={() => setLayersOpen(false)} aria-label="Close layers" className="pressable rounded-lg p-1.5 hover:bg-black/5">
                    <X size={15} />
                  </button>
                </div>
                {layerOptions.map((layer) => {
                  const checked = activeLayers.includes(layer.id);
                  return (
                    <button
                      key={layer.id}
                      onClick={() => toggleLayer(layer.id)}
                      className="pressable flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-black/[0.035]"
                    >
                      <span className={`grid size-5 place-items-center rounded-md border ${checked ? "border-[#182923] bg-[#182923] text-white" : "border-black/15 bg-white"}`}>
                        {checked && <span className="size-1.5 rounded-full bg-[#d8ff64]" />}
                      </span>
                      <span>
                        <span className="block text-sm font-semibold tracking-[-0.02em]">{layer.label}</span>
                        <span className="block text-[11px] text-[#6c7773]">{layer.count}</span>
                      </span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            className="pressable flex h-12 items-center gap-2.5 rounded-2xl border border-black/8 bg-[#f9f6ef]/96 px-4 text-sm font-semibold text-[#11201c] shadow-[0_14px_38px_rgba(0,0,0,0.16)] backdrop-blur-xl"
            onClick={() => setLayersOpen((open) => !open)}
            aria-expanded={layersOpen}
          >
            <Layers3 size={17} />
            {activeLayerLabel}
            <ChevronDown size={14} className={`opacity-45 transition-transform duration-200 ${layersOpen ? "rotate-180" : ""}`} />
          </button>
        </div>
        <div className="rounded-lg bg-[#09110f]/75 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-white/60 backdrop-blur-lg">
          {mapReady ? "Map ready · Chennai" : "Loading the city…"}
        </div>
      </div>

      <AnimatePresence>
        {mobilePanelOpen && (
          <>
            <motion.button
              className="absolute inset-0 z-40 bg-black/35 backdrop-blur-[2px] lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setMobilePanelOpen(false)}
              aria-label="Close panel"
            />
            <motion.aside
              className="absolute inset-x-2 bottom-2 z-50 flex max-h-[84dvh] flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#09110f] shadow-[0_28px_80px_rgba(0,0,0,0.4)] lg:hidden"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(100%)" }}
              animate={{ opacity: 1, transform: "translateY(0%)" }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, transform: "translateY(100%)" }}
              transition={{ type: "spring", duration: 0.42, bounce: 0.08 }}
            >
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-3">
                <span className="mx-auto h-1 w-10 rounded-full bg-white/20" />
                <button className="pressable absolute right-3 rounded-xl p-2 text-white/60 hover:bg-white/5" onClick={() => setMobilePanelOpen(false)} aria-label="Close network panel">
                  <X size={18} />
                </button>
              </div>
              <PanelContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}

function PanelContent() {
  return (
    <>
      <div className="border-b border-white/8 px-5 pb-5 pt-5">
        <button className="pressable mb-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.055] px-3 py-2 text-xs font-medium text-white/72 hover:bg-white/[0.08]">
          <span className="text-base leading-none">🇮🇳</span>
          Chennai, India
          <ChevronDown size={13} className="ml-1 opacity-50" />
        </button>
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[#d8ff64]">Living network</p>
            <h1 className="text-[30px] font-semibold leading-[1.04] tracking-[-0.055em]">Chennai<br />in motion.</h1>
          </div>
          <div className="mb-1 flex items-center gap-1.5 rounded-full border border-[#d8ff64]/20 bg-[#d8ff64]/10 px-2.5 py-1.5 text-[10px] font-semibold text-[#d8ff64]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#d8ff64]" />
            2 open
          </div>
        </div>
        <p className="mt-3 max-w-[290px] text-sm leading-5 text-white/48">
          The network you ride today—and the city it is becoming.
        </p>
        <button className="pressable mt-5 flex h-11 w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.06] px-3.5 text-left text-sm text-white/42 hover:bg-white/[0.085] hover:text-white/64">
          <Search size={16} />
          Find a station, line or place
          <span className="ml-auto rounded-md border border-white/10 px-1.5 py-0.5 font-mono text-[9px]">⌘ K</span>
        </button>
      </div>

      <div className="scrollbar-none flex-1 overflow-y-auto px-3 pb-5 pt-3">
        <div className="mb-2 flex items-center justify-between px-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/32">The network</span>
          <span className="text-[10px] text-white/30">5 corridors</span>
        </div>
        <div className="space-y-1">
          {lines.map((line, index) => (
            <motion.button
              key={line.id}
              className="pressable group flex w-full items-center gap-3 rounded-2xl px-2 py-2.5 text-left hover:bg-white/[0.05]"
              initial={{ opacity: 0, transform: "translateY(6px)" }}
              animate={{ opacity: 1, transform: "translateY(0px)" }}
              transition={{ duration: 0.28, delay: 0.12 + index * 0.045, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className="relative flex h-10 w-5 shrink-0 justify-center">
                <span className="absolute inset-y-0 w-[3px] rounded-full" style={{ background: line.color }} />
                <span className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#09110f]" style={{ background: line.color, boxShadow: `0 0 0 1px ${line.color}` }} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold tracking-[-0.02em] text-white/88">{line.label}</span>
                  <span className={`rounded-md px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.08em] ${line.status === "Live" ? "bg-[#d8ff64]/10 text-[#d8ff64]" : "bg-white/[0.06] text-white/34"}`}>{line.status}</span>
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-white/34">{line.detail}</span>
              </span>
              <ArrowUpRight size={15} className="text-white/18 transition-colors duration-150 group-hover:text-white/60" />
            </motion.button>
          ))}
        </div>

        <div className="mx-2 my-4 h-px bg-white/8" />

        <button className="pressable group flex w-full items-start gap-3 rounded-2xl border border-[#d8ff64]/12 bg-[#d8ff64]/[0.055] p-3.5 text-left hover:bg-[#d8ff64]/[0.08]">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#d8ff64] text-[#0b1512]">
            <Sparkles size={16} />
          </span>
          <span className="flex-1">
            <span className="flex items-center justify-between text-xs font-semibold text-[#eaffb2]">
              See Chennai in 2028
              <ArrowUpRight size={14} />
            </span>
            <span className="mt-1 block text-[10px] leading-4 text-white/38">Preview 118.9 km of Phase II as one connected network.</span>
          </span>
        </button>
      </div>

      <div className="flex items-center gap-1 border-t border-white/8 p-3">
        <button className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl bg-white/[0.055] py-2.5 text-[11px] font-medium text-white/55 hover:bg-white/[0.08] hover:text-white/80">
          <Map size={14} /> Explore
        </button>
        <button className="pressable flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-[11px] font-medium text-white/32 hover:bg-white/[0.05] hover:text-white/65">
          <Construction size={14} /> Projects
        </button>
        <button className="pressable grid size-9 place-items-center rounded-xl text-white/30 hover:bg-white/[0.05] hover:text-white/65" aria-label="About this data">
          <CircleHelp size={15} />
        </button>
      </div>
    </>
  );
}
