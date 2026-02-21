'use client';

import { useState, useEffect, useRef } from 'react';
import ForceGraph2D, { ForceGraphMethods } from 'react-force-graph-2d';

interface GraphCanvasProps {
    graphData: { nodes: any[], links: any[] };
    activeSchool: string;
    searchQuery: string;
    completedPapers?: string[];
    onToggleRead?: (paperId: string) => void;
}

const colors: Record<string, string> = {
    'Functionalism': '#3b82f6', // blue
    'Anti-Functionalism': '#ef4444', // red
    'Dualism': '#8b5cf6', // purple
    'Connectionism': '#10b981', // green
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

    useEffect(() => {
        // Dynamic resize
        const handleResize = () => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight - 80 }); // rough header offset
        };
        handleResize(); // initial set
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Tweak the underlying 2D physics engine for a clearer, more spacious layout
    useEffect(() => {
        if (fgRef.current) {
            // Increase repulsion (default is -30) to push nodes much further apart
            const charge = fgRef.current.d3Force('charge');
            if (charge) charge.strength(-500);

            // Increase the natural resting distance of links
            const link = fgRef.current.d3Force('link');
            if (link) link.distance(120);

            // Re-heat simulation to apply the new forces
            fgRef.current.d3ReheatSimulation();
        }
    }, [graphData]);

    return (
        <div className="relative w-full h-full bg-slate-950">
            <ForceGraph2D
                ref={fgRef}
                width={dimensions.width}
                height={dimensions.height}
                graphData={graphData}
                nodeLabel={() => ''} /* Disable default tooltip since we use custom overlay */
                nodeColor={(node: any) => completedPapers.includes(node.id) ? '#fbbf24' : (colors[node.group] || '#94a3b8')}
                nodeRelSize={8}
                linkColor={(link: any) => link._isCitation ? 'rgba(59, 130, 246, 0.4)' : 'rgba(255, 255, 255, 0.2)'}
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

                    // Completion Highlight
                    const isCompleted = completedPapers.includes(node.id);
                    if (isCompleted) {
                        ctx.beginPath();
                        ctx.arc(node.x, node.y, (node.group === 2 ? 14 : 8) + 4, 0, 2 * Math.PI, false);
                        ctx.fillStyle = 'rgba(251, 191, 36, 0.2)'; // Gold glow
                        ctx.fill();
                    }

                    // Node circle
                    ctx.beginPath();
                    const radius = node.group === 2 ? 14 : 8; // Schools are larger
                    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                    ctx.fillStyle = isCompleted ? '#fbbf24' : (colors[node.group] || colors[node.name] || '#94a3b8');
                    ctx.fill();

                    // Label text - Only draw if zoomed in OR if it's a major philosophical school
                    const showLabel = globalScale >= 1.2 || node.group === 2;

                    if (showLabel) {
                        ctx.font = `${fontSize}px Sans-Serif`;
                        const textWidth = ctx.measureText(label).width;
                        const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                        // Label background
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                        ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y + 12 - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);

                        // Label text
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillStyle = '#ffffff';
                        ctx.fillText(label, node.x, node.y + 12);
                    }

                    ctx.globalAlpha = 1.0; // Reset alpha
                }}
            />

            {/* Elegant Hover Overlay */}
            {selectedNode && (
                <div className="absolute top-4 right-4 bg-slate-900/90 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm backdrop-blur-md transition-opacity duration-300">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                            <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: completedPapers.includes(selectedNode.id) ? '#fbbf24' : (colors[selectedNode.group] || colors[selectedNode.name] || '#94a3b8') }}
                            />
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                                {selectedNode.group === 2 ? 'Philosophical School' : 'Paper'}
                            </span>
                        </div>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-500 hover:text-white transition-colors">
                            ✕
                        </button>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 leading-tight">
                        {selectedNode.name}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed border-t border-slate-700/50 pt-3 mb-4">
                        {selectedNode.tldr}
                    </p>

                    {/* Action Buttons */}
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
