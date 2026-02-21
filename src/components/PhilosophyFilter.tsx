'use client';

import { useState } from 'react';
import { Search, Filter, BookOpen } from 'lucide-react';

// Schools are now passed in dynamically as a prop

interface PhilosophyFilterProps {
    schools: string[];
    onFilter: (school: string, query: string) => void;
}

export default function PhilosophyFilter({ schools, onFilter }: PhilosophyFilterProps) {
    const [activeSchool, setActiveSchool] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const handleSchoolChange = (school: string) => {
        setActiveSchool(school);
        onFilter(school, searchQuery);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        onFilter(activeSchool, e.target.value);
    };

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
                        onChange={handleSearchChange}
                    />
                </div>

                {/* Schools Filter */}
                <div className="flex-1 w-full overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                    <div className="flex space-x-2 items-center">
                        <Filter className="h-4 w-4 text-slate-500 mr-2 shrink-0" />
                        {['All', ...schools].map(school => (
                            <button
                                key={school}
                                onClick={() => handleSchoolChange(school)}
                                className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeSchool === school
                                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {school}
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
