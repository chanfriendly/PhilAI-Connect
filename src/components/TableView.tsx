'use client';

import { useMemo, useState } from 'react';
import { CheckCircle, ExternalLink, Circle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { getDifficultyLabel } from './GraphCanvas';
import { DIFFICULTY_LEVELS } from './PhilosophyFilter';

type SortField = 'title' | 'difficulty';
type SortDir = 'asc' | 'desc';

interface TableViewProps {
    graphData: { nodes: any[], links: any[] };
    completedPapers?: string[];
    onToggleRead?: (paperId: string) => void;
}

// Helper: find difficulty level config for styling
const getDifficultyConfig = (difficulty: number) => {
    const level = Math.floor((difficulty || 300) / 100) * 100;
    return DIFFICULTY_LEVELS.find(d => d.value === String(level)) || DIFFICULTY_LEVELS[0];
};

// Difficulty dot colors matching the graph canvas
const DIFFICULTY_COLORS: Record<number, string> = {
    100: '#10b981',
    200: '#3b82f6',
    300: '#8b5cf6',
    400: '#f59e0b',
    500: '#ef4444',
};

export default function TableView({
    graphData,
    completedPapers = [],
    onToggleRead = () => { }
}: TableViewProps) {

    const [sortField, setSortField] = useState<SortField>('difficulty');
    const [sortDir, setSortDir] = useState<SortDir>('asc');

    // Build a map from paper ID → school names by scanning the link list
    // Links from papers to schools look like: { source: paperId, target: 'school-Functionalism' }
    const paperSchools = useMemo(() => {
        const map = new Map<string, string[]>();
        graphData.links.forEach((link: any) => {
            const sourceId = link.source?.id || link.source;
            const targetId = link.target?.id || link.target;
            if (typeof targetId === 'string' && targetId.startsWith('school-')) {
                const schoolName = targetId.replace('school-', '');
                if (!map.has(sourceId)) map.set(sourceId, []);
                const schools = map.get(sourceId)!;
                if (!schools.includes(schoolName)) schools.push(schoolName);
            }
        });
        return map;
    }, [graphData.links]);

    // Filter to paper nodes only
    const papers = graphData.nodes.filter((n: any) => n.group === 1);

    // Sort papers
    const sortedPapers = useMemo(() => {
        return [...papers].sort((a, b) => {
            let comparison = 0;
            if (sortField === 'title') {
                comparison = (a.name || '').localeCompare(b.name || '');
            } else if (sortField === 'difficulty') {
                comparison = (a.difficulty || 300) - (b.difficulty || 300);
            }
            return sortDir === 'asc' ? comparison : -comparison;
        });
    }, [papers, sortField, sortDir]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('asc');
        }
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />;
        return sortDir === 'asc'
            ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" />
            : <ArrowDown className="w-3.5 h-3.5 text-emerald-400" />;
    };

    if (papers.length === 0) {
        return (
            <div className="w-full h-[800px] border border-slate-800 rounded-xl bg-slate-900/50 flex flex-col items-center justify-center text-slate-400">
                <p className="text-lg">No papers found for this filter.</p>
                <p className="text-sm mt-2 text-slate-500">Try adjusting the school or difficulty filters above.</p>
            </div>
        );
    }

    return (
        <div className="w-full h-[800px] border border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-slate-900/80 backdrop-blur-xl flex flex-col">

            {/* Sort Controls Header */}
            <div className="shrink-0 px-6 py-3 border-b border-slate-800 bg-slate-900/60 flex items-center gap-3">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">Sort by:</span>
                <button
                    onClick={() => handleSort('difficulty')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        sortField === 'difficulty'
                            ? 'bg-slate-700 text-white border-slate-600'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white border-slate-700/50'
                    }`}
                >
                    Difficulty <SortIcon field="difficulty" />
                </button>
                <button
                    onClick={() => handleSort('title')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                        sortField === 'title'
                            ? 'bg-slate-700 text-white border-slate-600'
                            : 'bg-slate-800/50 text-slate-400 hover:text-white border-slate-700/50'
                    }`}
                >
                    Title <SortIcon field="title" />
                </button>
                <span className="ml-auto text-xs text-slate-600">{papers.length} paper{papers.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Scrollable Paper List */}
            <div className="overflow-y-auto flex-1 p-6 custom-scrollbar">
                <div className="space-y-4">
                    {sortedPapers.map((paper) => {
                        const isCompleted = completedPapers.includes(paper.id);
                        const schools = paperSchools.get(paper.id) || [];
                        const diffLevel = Math.floor((paper.difficulty || 300) / 100) * 100;
                        const diffColor = DIFFICULTY_COLORS[diffLevel] || '#94a3b8';
                        const diffLabel = getDifficultyLabel(paper.difficulty || 300);
                        const isEntryPoint = diffLevel <= 100;

                        return (
                            <div
                                key={paper.id}
                                className={`p-5 rounded-xl border transition-all ${
                                    isCompleted
                                        ? 'bg-amber-500/5 border-amber-500/20'
                                        : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-800 hover:border-slate-600'
                                }`}
                            >
                                <div className="flex items-start gap-4">
                                    {/* Read/Unread Toggle */}
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

                                    <div className="flex-1 min-w-0">
                                        {/* Title + External Link */}
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

                                        {/* Tags Row: difficulty + schools */}
                                        <div className="mt-2 flex flex-wrap gap-2 items-center">
                                            {/* Difficulty tag — color matches the graph node */}
                                            <span
                                                className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md border"
                                                style={{
                                                    backgroundColor: `${diffColor}15`,
                                                    color: diffColor,
                                                    borderColor: `${diffColor}35`,
                                                }}
                                            >
                                                <span
                                                    className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
                                                    style={{ backgroundColor: diffColor }}
                                                />
                                                {diffLabel} ({paper.difficulty || 300})
                                                {isEntryPoint && <span className="ml-1.5 opacity-70">· Entry Point</span>}
                                            </span>

                                            {/* School tags */}
                                            {schools.map(school => (
                                                <span
                                                    key={school}
                                                    className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-md bg-slate-700/60 text-slate-300 border border-slate-600/50"
                                                >
                                                    {school}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Abstract / TL;DR */}
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
