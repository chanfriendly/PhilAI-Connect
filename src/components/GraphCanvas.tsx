'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

interface GraphCanvasProps {
    graphData: { nodes: any[], links: any[] };
    activeSchool: string;
    searchQuery: string;
    completedPapers?: string[];
    onToggleRead?: (paperId: string) => void;
}

// --- Color Utilities ---

// Difficulty-based color gradient for paper nodes
// Analogy: think of it like a traffic light extended — green means "come on in", red means "bring your PhD"
const DIFFICULTY_COLORS: Record<number, string> = {
    100: '#10b981', // emerald  — Introductory
    200: '#3b82f6', // blue     — Beginner
    300: '#8b5cf6', // violet   — Intermediate
    400: '#f59e0b', // amber    — Advanced
    500: '#ef4444', // red      — Expert
};

const getDifficultyColor = (difficulty: number): string => {
    const level = Math.floor((difficulty || 300) / 100) * 100;
    return DIFFICULTY_COLORS[level] || '#94a3b8';
};

// Deterministic color palette for school nodes — hashed from name so colors are stable across sessions
const SCHOOL_PALETTE = [
    '#06b6d4', // cyan
    '#ec4899', // pink
    '#84cc16', // lime
    '#f97316', // orange
    '#6366f1', // indigo
    '#14b8a6', // teal
    '#a855f7', // purple
    '#fb923c', // light orange
    '#22d3ee', // light cyan
    '#f43f5e', // rose
];

const getSchoolColor = (name: string): string => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = (hash * 31 + name.charCodeAt(i)) % SCHOOL_PALETTE.length;
    }
    return SCHOOL_PALETTE[Math.abs(hash)];
};

// Difficulty level labels for the legend and overlay
const DIFFICULTY_LABELS: Record<number, string> = {
    100: 'Introductory',
    200: 'Beginner',
    300: 'Intermediate',
    400: 'Advanced',
    500: 'Expert',
};

export const getDifficultyLabel = (difficulty: number): string => {
    const level = Math.floor((difficulty || 300) / 100) * 100;
    return DIFFICULTY_LABELS[level] || 'Intermediate';
};

export default function GraphCanvas({
    graphData,
    activeSchool,
    searchQuery,
    completedPapers = [],
    onToggleRead = () => { },
}: GraphCanvasProps) {
    const fgRef = useRef<ForceGraphMethods | undefined>(undefined);
    const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
    const [selectedNode, setSelectedNode] = useState<any>(null);
    const [showLegend, setShowLegend] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight - 80 });
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (fgRef.current) {
            const charge = fgRef.current.d3Force('charge');
            if (charge) charge.strength(-500);
            const link = fgRef.current.d3Force('link');
            if (link) link.distance(120);
            fgRef.current.d3ReheatSimulation();
        }
    }, [graphData]);

    // --- Suggested Learning Path ---
    // When a school filter is active, we sort that school's papers by difficulty
    // and number them 1→N. Think of it as a trail map: you can see the whole territory
    // but the numbered markers tell you where to start.
    const suggestedPath = useMemo(() => {
        if (activeSchool === 'All') return new Map<string, number>();

        const schoolId = `school-${activeSchool}`;

        const schoolPapers = graphData.nodes
            .filter((n: any) => n.group === 1)
            .filter((n: any) =>
                graphData.links.some((l: any) => {
                    const sourceId = l.source?.id || l.source;
                    const targetId = l.target?.id || l.target;
                    return sourceId === n.id && targetId === schoolId;
                })
            )
            .sort((a: any, b: any) => (a.difficulty || 300) - (b.difficulty || 300));

        const pathMap = new Map<string, number>();
        schoolPapers.forEach((paper: any, idx: number) => {
            pathMap.set(paper.id, idx + 1);
        });
        return pathMap;
    }, [graphData, activeSchool]);

    return (
        <div className="relative w-full h-full bg-slate-950">
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel={() => ''}
                nodeColor={(node: any) =>
                    completedPapers.includes(node.id)
                        ? '#fbbf24'
                        : node.group === 1
                            ? getDifficultyColor(node.difficulty)
                            : getSchoolColor(node.name)
                }
                nodeRelSize={8}
                linkColor={(link: any) => link._isCitation ? 'rgba(59, 130, 246, 0.45)' : 'rgba(255, 255, 255, 0.15)'}
                linkDirectionalParticles={(link: any) => link._isCitation ? 2 : 0}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalArrowLength={3.5}
                linkDirectionalArrowRelPos={1}
                linkCurvature={0.25}
                onNodeClick={(node) => setSelectedNode(node || null)}
                onBackgroundClick={() => setSelectedNode(null)}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12 / globalScale;
                    const isCompleted = completedPapers.includes(node.id);
                    const isSchool = node.group === 2;
                    const radius = isSchool ? 14 : 8;
                    const pathIndex = suggestedPath.get(node.id);

                    // --- Completion glow (gold) ---
                    if (isCompleted) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(251, 191, 36, 0.2)';
                        ctx.fill();
                    }

                    // --- Entry-point glow (emerald) for level 100 papers ---
                    const isEntryPoint = node.group === 1 && (node.difficulty || 300) < 200;
                    if (isEntryPoint && !isCompleted) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, radius + 5, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
                        ctx.fill();
                    }

                    // --- Suggested path glow (white pulse) ---
                    if (pathIndex !== undefined) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
                        ctx.fill();
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, radius + 4, 0, 2 * Math.PI, false);
                        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                        ctx.lineWidth = 1.5 / globalScale;
                        ctx.stroke();
                    }

                    // --- Main node circle ---
                    const nodeColor = isCompleted
                        ? '#fbbf24'
                        : isSchool
                            ? getSchoolColor(node.name)
                            : getDifficultyColor(node.difficulty);

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = nodeColor;
                    ctx.fill();

                    // --- Label text (visible when zoomed in or for school nodes) ---
                    const showLabel = globalScale >= 1.2 || isSchool;
                    if (showLabel) {
                        ctx.font = `${isSchool ? 'bold ' : ''}${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.4);
                        ctx.fillStyle = 'rgba(2, 6, 23, 0.85)';
                        ctx.fillRect(
                            node.x - bckgDimensions[0] / 2,
                            node.y + radius + 2,
                            bckgDimensions[0],
                            bckgDimensions[1]
                        );
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'top';
                        ctx.fillStyle = isSchool ? nodeColor : '#e2e8f0';
                        ctx.fillText(label, node.x, node.y + radius + 2 + (fontSize * 0.2));
                    }

                    // --- Suggested path number badge ---
                    if (pathIndex !== undefined) {
                        const badgeRadius = 7 / globalScale;
                        ctx.beginPath();
                        ctx.arc(node.x + radius, node.y - radius, badgeRadius, 0, 2 * Math.PI, false);
                        ctx.fillStyle = '#ffffff';
                        ctx.fill();
                        ctx.font = `bold ${9 / globalScale}px Sans-Serif`;
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#020617';
                        ctx.fillText(String(pathIndex), node.x + radius, node.y - radius);
                    }

                    ctx.globalAlpha = 1.0;
                }}
            />

            {/* --- Graph Legend (collapsible) --- */}
            <div className="absolute bottom-4 left-4 z-10 select-none">
                <button
                    onClick={() => setShowLegend(prev => !prev)}
                    className="flex items-center gap-2 bg-slate-900/80 border border-slate-700 text-slate-400 text-xs font-semibold px-3 py-1.5 rounded-lg hover:text-white hover:border-slate-500 transition-all backdrop-blur-md"
                >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
                    {showLegend ? 'Hide Legend' : 'Show Legend'}
                </button>

                {showLegend && (
                    <div className="mt-2 bg-slate-900/90 border border-slate-700 rounded-xl p-4 text-xs backdrop-blur-md shadow-2xl w-52">
                        <p className="text-slate-500 uppercase tracking-widest text-[10px] font-semibold mb-3">Difficulty Level</p>
                        <div className="space-y-1.5 mb-4">
                            {Object.entries(DIFFICULTY_COLORS).map(([level, color]) => (
                                <div key={level} className="flex items-center gap-2.5">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                                    <span className="text-slate-300">
                                        {DIFFICULTY_LABELS[Number(level)]}
                                        <span className="text-slate-500 ml-1">({level})</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t border-slate-700/60 pt-3 space-y-1.5">
                            <p className="text-slate-500 uppercase tracking-widest text-[10px] font-semibold mb-2">Nodes & Links</p>
                            <div className="flex items-center gap-2.5">
                                <span className="w-4 h-4 rounded-full shrink-0 bg-cyan-400" />
                                <span className="text-slate-300">Philosophical School</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-3 h-3 rounded-full shrink-0 bg-amber-400 ring-2 ring-amber-400/40" />
                                <span className="text-slate-300">Completed Paper</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <div className="w-4 h-0.5 shrink-0 bg-blue-400 rounded" />
                                <span className="text-slate-300">Citation Link</span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-4 h-4 rounded-full shrink-0 bg-slate-700 border border-white/30 flex items-center justify-center text-[9px] text-white font-bold">1</span>
                                <span className="text-slate-300">Suggested Path Order</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- Node Detail Overlay --- */}
            {selectedNode && (
                <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm backdrop-blur-md transition-opacity duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{
                                    backgroundColor: completedPapers.includes(selectedNode.id)
                                        ? '#fbbf24'
                                        : selectedNode.group === 2
                                            ? getSchoolColor(selectedNode.name)
                                            : getDifficultyColor(selectedNode.difficulty)
                                }}
                            />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {selectedNode.group === 2 ? 'Philosophical School' : 'Paper'}
                            </span>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition-colors">
                            ✕
                        </button>
                    </div>

                    {selectedNode.group === 1 && (
                        <div className="mb-3 flex items-center gap-2 flex-wrap">
                            <span
                                className="text-xs font-bold px-2.5 py-1 rounded-md border"
                                style={{
                                    backgroundColor: `${getDifficultyColor(selectedNode.difficulty)}18`,
                                    color: getDifficultyColor(selectedNode.difficulty),
                                    borderColor: `${getDifficultyColor(selectedNode.difficulty)}40`,
                                }}
                            >
                                {getDifficultyLabel(selectedNode.difficulty || 300)} ({selectedNode.difficulty || 300})
                                {(selectedNode.difficulty || 300) < 200 && ' · Recommended Entry Point'}
                            </span>
                            {suggestedPath.has(selectedNode.id) && (
                                <span className="text-xs font-bold px-2.5 py-1 rounded-md border bg-white/10 text-white border-white/20">
                                    Path #{suggestedPath.get(selectedNode.id)}
                                </span>
                            )}
                        </div>
                    )}

                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                        {selectedNode.name}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed border-t border-slate-700/50 pt-3 mb-4">
                        {selectedNode.tldr}
                    </p>

                    {selectedNode.group === 1 && (
                        <div className="flex flex-col gap-2 mt-2">
                            {selectedNode.id.startsWith('http') && (
                                <button
                                    onClick={() => window.open(selectedNode.id, '_blank')}
                                    className="w-full text-center rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-semibold py-2 transition-colors border border-emerald-500/30"
                                >
                                    Open Original Source
                                </button>
                            )}
                            <button
                                onClick={() => onToggleRead(selectedNode.id)}
                                className={`w-full text-center rounded-lg font-semibold py-2 transition-colors border ${completedPapers.includes(selectedNode.id)
                                    ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                                    }`}
                            >
                                {completedPapers.includes(selectedNode.id) ? '✓ Marked as Completed' : 'Mark as Completed'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
