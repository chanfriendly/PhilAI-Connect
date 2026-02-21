'use client';

import dynamic from 'next/dynamic';

const GraphCanvas = dynamic(() => import('./GraphCanvas'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full flex items-center justify-center bg-slate-950 text-slate-400">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium tracking-wide uppercase">Wiring Neural Pathways...</p>
            </div>
        </div>
    )
});

interface ArgumentMapProps {
    graphData: any;
    activeSchool: string;
    searchQuery: string;
    completedPapers?: string[];
    onToggleRead?: (paperId: string) => void;
}

export default function ArgumentMap({
    graphData,
    activeSchool,
    searchQuery,
    completedPapers = [],
    onToggleRead = () => { }
}: ArgumentMapProps) {
    return (
        <div className="w-full h-[800px] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
            <GraphCanvas
                graphData={graphData}
                activeSchool={activeSchool}
                searchQuery={searchQuery}
                completedPapers={completedPapers}
                onToggleRead={onToggleRead}
            />
        </div>
    );
}
