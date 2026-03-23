'use client';

import { useState, useEffect, useMemo } from 'react';
import ArgumentMap from '@/components/ArgumentMap';
import PhilosophyFilter from '@/components/PhilosophyFilter';
import AuthModal from '@/components/AuthModal';
import TableView from '@/components/TableView';
import { supabase } from '@/lib/db/supabase';
import { Mail, LogIn, LogOut, Network, List } from 'lucide-react';

export default function Home() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });

  // Filter state — all managed here so the filter component is fully controlled
  // (no hidden internal state that can get out of sync with the rest of the app)
  const [activeSchool, setActiveSchool] = useState('All');
  const [activeDifficulty, setActiveDifficulty] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Subscription state
  const [email, setEmail] = useState('');
  const [subStatus, setSubStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [subMessage, setSubMessage] = useState('');

  // Authentication & Progress state
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [completedPapers, setCompletedPapers] = useState<string[]>([]);

  // View Toggle
  const [viewMode, setViewMode] = useState<'graph' | 'table'>('graph');

  // Fetch initial graph data
  useEffect(() => {
    fetch('/api/graph')
      .then(res => res.json())
      .then(data => setGraphData(data))
      .catch(err => console.error("Error fetching graph data:", err));
  }, []);

  // Handle Authentication and fetch user progress
  useEffect(() => {
    const fetchProgress = async (userId: string) => {
      const { data } = await supabase
        .from('user_progress')
        .select('paper_id')
        .eq('user_id', userId);

      if (data) {
        setCompletedPapers(data.map(d => d.paper_id));
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
      if (session?.user) fetchProgress(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        fetchProgress(session.user.id);
      } else {
        setCompletedPapers([]);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Derive the top 5 most-connected schools dynamically from graph data
  const schoolCounts: Record<string, number> = {};
  graphData.links.forEach((l: any) => {
    const targetId = l.target?.id || l.target;
    if (typeof targetId === 'string' && targetId.startsWith('school-')) {
      const schoolName = targetId.replace('school-', '');
      schoolCounts[schoolName] = (schoolCounts[schoolName] || 0) + 1;
    }
  });

  const schools = Object.entries(schoolCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  const handleClearFilters = () => {
    setActiveSchool('All');
    setActiveDifficulty('All');
    setSearchQuery('');
  };

  // Hard culling: physically remove nodes that don't match all active filters
  const filteredGraphData = useMemo(() => {
    if (!graphData.nodes.length) return { nodes: [], links: [] };

    const validNodes = graphData.nodes.filter((node: any) => {
      const isSchoolMatch = activeSchool === 'All' ||
        node.name === activeSchool ||
        graphData.links.some((l: any) =>
          (l.source?.id === node.id || l.source === node.id) &&
          (l.target?.id === `school-${activeSchool}` || l.target === `school-${activeSchool}`)
        );

      const isSearchMatch = searchQuery === '' ||
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (node.tldr && node.tldr.toLowerCase().includes(searchQuery.toLowerCase()));

      let isDifficultyMatch = true;
      if (activeDifficulty !== 'All' && node.group === 1) {
        const levelFloor = Math.floor((node.difficulty || 300) / 100) * 100;
        isDifficultyMatch = levelFloor === Number(activeDifficulty);
      }

      return isSchoolMatch && isSearchMatch && isDifficultyMatch;
    });

    const validNodeIds = new Set(validNodes.map((n: any) => n.id));

    const validLinks = graphData.links.filter((l: any) => {
      const sourceId = l.source?.id || l.source;
      const targetId = l.target?.id || l.target;
      return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
    });

    return { nodes: validNodes, links: validLinks };
  }, [graphData, activeSchool, searchQuery, activeDifficulty]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setSubStatus('success');
        setSubMessage('Subscribed! You\'ll receive new papers and discussions weekly.');
        setEmail('');
        setTimeout(() => setSubStatus('idle'), 4000);
      } else {
        setSubStatus('error');
        setSubMessage(data.error?.message || (typeof data.error === 'string' ? data.error : 'Failed to subscribe'));
        setTimeout(() => setSubStatus('idle'), 3000);
      }
    } catch (err) {
      setSubStatus('error');
      setSubMessage('Network error occurred.');
      setTimeout(() => setSubStatus('idle'), 3000);
    }
  };

  const handleToggleReadStatus = async (paperId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const isCompleted = completedPapers.includes(paperId);

    // Optimistic UI update
    setCompletedPapers(prev =>
      isCompleted ? prev.filter(id => id !== paperId) : [...prev, paperId]
    );

    if (isCompleted) {
      await supabase.from('user_progress').delete().match({ user_id: user.id, paper_id: paperId });
    } else {
      await supabase.from('user_progress').insert([{ user_id: user.id, paper_id: paperId }]);
    }
  };

  return (
    <main className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-emerald-500/30">

      {/* Top Navigation */}
      <nav className="absolute top-0 w-full p-4 flex justify-end z-40">
        {user ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-emerald-400 font-medium">Logged in as {user.email}</span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex items-center text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="flex items-center rounded-full bg-slate-800/50 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-700/50 transition-colors border border-slate-700 backdrop-blur-md"
          >
            <LogIn className="w-4 h-4 mr-2" /> Track Progress
          </button>
        )}
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {/* Header Container */}
      <div className="relative isolate pt-14">
        <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80">
          <div className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#3b82f6] to-[#10b981] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"></div>
        </div>

        <div className="mx-auto max-w-7xl px-6 lg:px-8 py-12">
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 pb-2">
              PhilAI Connect
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Mapping the intersection of artificial intelligence and philosophy.
              Explore the argument lineage, discover philosophical schools, and trace the evolution of thought.
            </p>

            {/* Email Signup */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 max-w-md mx-auto">
              <form onSubmit={handleSubscribe} className="flex w-full gap-x-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={subStatus === 'loading' || subStatus === 'success'}
                  className="flex-auto rounded-full bg-slate-900 border-slate-700 px-6 py-3 text-sm text-white focus:ring-emerald-500 focus:border-emerald-500 shadow-sm ring-1 ring-inset ring-slate-800 disabled:opacity-50 transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={subStatus === 'loading' || subStatus === 'success'}
                  className="flex-none rounded-full bg-emerald-500/10 px-6 py-3 text-sm font-semibold text-emerald-400 shadow-sm hover:bg-emerald-500/20 ring-1 ring-inset ring-emerald-500/30 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {subStatus === 'loading' ? 'Joining...' : 'The Signal'}
                </button>
              </form>
              <p className="text-xs text-slate-500">
                A weekly digest of new papers at the AI–philosophy intersection.
              </p>

              {subStatus === 'success' && (
                <p className="text-sm text-emerald-400 animate-pulse">{subMessage}</p>
              )}
              {subStatus === 'error' && (
                <p className="text-sm text-rose-400">{subMessage}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8 pb-24">

        {/* Controls Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-4 gap-4">
          <PhilosophyFilter
            schools={schools}
            activeSchool={activeSchool}
            activeDifficulty={activeDifficulty}
            searchQuery={searchQuery}
            onSchoolChange={setActiveSchool}
            onSearchChange={setSearchQuery}
            onDifficultyChange={setActiveDifficulty}
            onClearFilters={handleClearFilters}
          />

          <button
            onClick={() => setViewMode(prev => prev === 'graph' ? 'table' : 'graph')}
            className="flex items-center rounded-xl bg-slate-900 border border-slate-700 px-4 py-2.5 text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shrink-0"
          >
            {viewMode === 'graph' ? (
              <><List className="w-4 h-4 mr-2 text-indigo-400" /> Switch to List View</>
            ) : (
              <><Network className="w-4 h-4 mr-2 text-emerald-400" /> Switch to Map View</>
            )}
          </button>
        </div>

        {/* Graph / Table Section */}
        <div className="relative w-full rounded-2xl overflow-hidden ring-1 ring-slate-800 shadow-2xl bg-slate-900/50 backdrop-blur-xl">
          {viewMode === 'graph' ? (
            <ArgumentMap
              graphData={filteredGraphData}
              activeSchool={activeSchool}
              searchQuery={searchQuery}
              completedPapers={completedPapers}
              onToggleRead={handleToggleReadStatus}
            />
          ) : (
            <TableView
              graphData={filteredGraphData}
              completedPapers={completedPapers}
              onToggleRead={handleToggleReadStatus}
            />
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-auto py-8 text-center text-sm text-slate-500">
        <p>&copy; {new Date().getFullYear()} PhilAI Connect. <a href="/admin" className="hover:text-emerald-400 transition-colors">Admin</a>.</p>
      </footer>
    </main>
  );
}
