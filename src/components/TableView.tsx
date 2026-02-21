'use client';

import { CheckCircle, ExternalLink, Circle } from 'lucide-react';

interface TableViewProps {
    graphData: { nodes: any[], links: any[] };
    completedPapers?: string[];
    onToggleRead?: (paperId: string) => void;
}

export default function TableView({
    graphData,
    completedPapers = [],
    onToggleRead = () => { }
}: TableViewProps) {

    // Filter out the school nodes, we only want to list the papers
    const papers = graphData.nodes.filter(n => n.group === 1);

    if (papers.length === 0) {
        return (
            <div className="w-full h-[800px] border border-slate-800 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center text-slate-400">
                <p className="text-lg">No papers found for this filter.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[800px] border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-900/80 backdrop-blur-xl flex flex-col">
            <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                <div className="space-y-4">
                    {papers.map((paper) => {
                        const isCompleted = completedPapers.includes(paper.id);

                        return (
                            <div
                                key={paper.id}
                                className={`p-5 rounded-xl border transition-all ${isCompleted
                                        ? 'bg-amber-500/5 border-amber-500/20'
                                        : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                    }`}
                            >
                                <div className="flex items-start gap-4">
                                    <button
                                        onClick={() => onToggleRead(paper.id)}
                                        className="mt-1 shrink-0 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-full"
                                        aria-label={isCompleted ? "Mark as unread" : "Mark as read"}
                                    >
                                        {isCompleted ? (
                                            <CheckCircle className="w-6 h-6 text-amber-400" />
                                        ) : (
                                            <Circle className="w-6 h-6 text-slate-500 hover:text-emerald-400 transition-colors" />
                                        )}
                                    </button>

                                    <div className="flex-1">
                                        <div className="flex justify-between items-start gap-4">
                                            <h3 className={`text-lg font-bold leading-tight ${isCompleted ? 'text-amber-100' : 'text-white'}`}>
                                                {paper.name}
                                            </h3>
                                            {paper.id.startsWith('http') && (
                                                <a
                                                    href={paper.id}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="shrink-0 text-slate-400 hover:text-emerald-400 transition-colors p-1"
                                                    title="Open original source"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                </a>
                                            )}
                                        </div>
                                        <p className="mt-3 text-sm leading-relaxed text-slate-300">
                                            {paper.tldr || "No abstract available."}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
