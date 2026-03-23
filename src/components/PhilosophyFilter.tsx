'use client';

import { Search, Filter, BookOpen, X } from 'lucide-react';

// Difficulty level definitions — single source of truth used by both the filter UI and the graph canvas.
// Named levels matter for an undergrad audience: "Intermediate" communicates more than "Level 300".
export const DIFFICULTY_LEVELS = [
    { value: 'All', label: 'All Levels', shortLabel: 'All', color: null },
    { value: '100', label: 'Introductory', shortLabel: 'Intro (100)', activeClass: 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 border-emerald-500', inactiveStyle: { color: '#10b981', borderColor: '#10b98133' } },
    { value: '200', label: 'Beginner',      shortLabel: 'Beginner (200)', activeClass: 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 border-blue-500', inactiveStyle: { color: '#3b82f6', borderColor: '#3b82f633' } },
    { value: '300', label: 'Intermediate',  shortLabel: 'Intermediate (300)', activeClass: 'bg-violet-500 text-white shadow-lg shadow-violet-500/20 border-violet-500', inactiveStyle: { color: '#8b5cf6', borderColor: '#8b5cf633' } },
    { value: '400', label: 'Advanced',      shortLabel: 'Advanced (400)', activeClass: 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-amber-500', inactiveStyle: { color: '#f59e0b', borderColor: '#f59e0b33' } },
    { value: '500', label: 'Expert',        shortLabel: 'Expert (500)', activeClass: 'bg-red-500 text-white shadow-lg shadow-red-500/20 border-red-500', inactiveStyle: { color: '#ef4444', borderColor: '#ef444433' } },
];

interface PhilosophyFilterProps {
    schools: string[];
    activeSchool: string;
    activeDifficulty: string;
    searchQuery: string;
    onSchoolChange: (school: string) => void;
    onSearchChange: (query: string) => void;
    onDifficultyChange: (difficulty: string) => void;
    onClearFilters: () => void;
}

export default function PhilosophyFilter({
    schools,
    activeSchool,
    activeDifficulty,
    searchQuery,
    onSchoolChange,
    onSearchChange,
    onDifficultyChange,
    onClearFilters,
}: PhilosophyFilterProps) {

    const hasActiveFilters = activeSchool !== 'All' || activeDifficulty !== 'All' || searchQuery !== '';

    return (
        <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 shadow-xl backdrop-blur-sm">
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">

                {/* Search Input */}
                <div className="relative w-full md:w-1/3">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-11 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-sm placeholder-slate-500 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                        placeholder="Search authors, papers, or concepts..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                {/* Philosophical Schools Filter */}
                <div className="flex-1 w-full overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    <div className="flex space-x-2 items-center">
                        <Filter className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                        {['All', ...schools].map(school => (
                            <button
                                key={school}
                                onClick={() => onSchoolChange(school)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                    activeSchool === school
                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                            >
                                {school}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Clear Filters Button — only visible when something is active */}
                {hasActiveFilters && (
                    <button
                        onClick={onClearFilters}
                        className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white bg-slate-800/50 hover:bg-slate-700 border border-slate-700/50 transition-all"
                        title="Clear all filters"
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear
                    </button>
                )}
            </div>

            {/* Cognitive Difficulty Filter */}
            <div className="mt-6 pt-6 border-t border-slate-800/50 flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex items-center text-slate-400 text-sm font-medium shrink-0">
                    <BookOpen className="h-4 w-4 mr-2" />
                    Difficulty:
                </div>
                <div className="flex-1 w-full overflow-x-auto hide-scrollbar">
                    <div className="flex space-x-2">
                        {DIFFICULTY_LEVELS.map(level => {
                            const isActive = activeDifficulty === level.value;
                            return (
                                <button
                                    key={level.value}
                                    onClick={() => onDifficultyChange(level.value)}
                                    className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 border ${
                                        isActive
                                            ? (level.activeClass || 'bg-slate-600 text-white border-slate-500')
                                            : 'bg-slate-800/50 hover:bg-slate-700 hover:text-white border-slate-700/50'
                                    }`}
                                    style={
                                        !isActive && level.inactiveStyle
                                            ? { color: level.inactiveStyle.color, borderColor: level.inactiveStyle.borderColor }
                                            : undefined
                                    }
                                >
                                    {level.shortLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
