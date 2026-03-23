'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, Trash2, Send, Clock, X, AlertCircle, Lock, Eye, EyeOff } from 'lucide-react';

interface Draft {
    id: string;
    subject: string;
    html_content: string;
    status: 'draft' | 'sent';
    created_at: string;
    sent_at: string | null;
}

// --- Password Gate ---
// The admin page is behind a simple password check. The correct password is stored
// in ADMIN_PASSWORD (server-side env var) and never exposed to the client.
// Auth state is kept in sessionStorage so it persists across page refreshes within
// the same browser tab, but resets when the tab is closed.
function PasswordGate({ onAuthenticated }: { onAuthenticated: () => void }) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/admin/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();

            if (data.success) {
                sessionStorage.setItem('admin_auth', 'true');
                onAuthenticated();
            } else {
                setError(data.error || 'Incorrect password.');
            }
        } catch {
            setError('Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                        <Lock className="w-7 h-7 text-rose-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Admin Access</h1>
                    <p className="text-slate-400 text-sm mt-2 text-center">
                        Enter the admin password to access the dashboard.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
                    <div className="relative mb-4">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Admin password"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-transparent pr-11"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(prev => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>

                    {error && (
                        <p className="text-rose-400 text-sm mb-4 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !password}
                        className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors"
                    >
                        {loading ? 'Verifying...' : 'Enter Dashboard'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// --- Main Admin Dashboard ---
export default function AdminDashboard() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);

    // Check if already authenticated in this session
    useEffect(() => {
        if (sessionStorage.getItem('admin_auth') === 'true') {
            setIsAuthenticated(true);
        }
        setCheckingAuth(false);
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchDrafts();
    }, [isAuthenticated]);

    const fetchDrafts = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/drafts');
            const data = await res.json();
            if (data.success) {
                setDrafts(data.drafts);
            }
        } catch (error) {
            console.error("Failed to fetch drafts", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, action: 'send' | 'delete') => {
        if (action === 'send' && !confirm('Broadcast this email to all subscribers?')) return;
        if (action === 'delete' && !confirm('Delete this draft permanently?')) return;

        setActionLoading(id);
        try {
            const res = await fetch(`/api/admin/drafts/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, action })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Successfully ${action === 'send' ? 'sent' : 'deleted'} the draft.`);
                setPreviewDraft(null);
                fetchDrafts();
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (error) {
            alert("Network error occurred.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleSignOut = () => {
        sessionStorage.removeItem('admin_auth');
        setIsAuthenticated(false);
    };

    // Still checking sessionStorage
    if (checkingAuth) return null;

    // Not yet authenticated — show password gate
    if (!isAuthenticated) {
        return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">
                <div className="animate-pulse text-slate-400">Loading Admin Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                        <AlertCircle className="w-8 h-8 text-rose-500" />
                        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    </div>
                    <button
                        onClick={handleSignOut}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Sign Out
                    </button>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-6 border-b border-slate-800 bg-slate-800/50">
                        <h2 className="text-xl font-semibold flex items-center">
                            <Mail className="w-5 h-5 mr-3 text-emerald-400" />
                            Email Drafts (Human-in-the-Loop)
                        </h2>
                        <p className="text-sm text-slate-400 mt-2">
                            Review AI-generated digests before broadcasting them via Resend.
                        </p>
                    </div>

                    <div className="divide-y divide-slate-800">
                        {drafts.length === 0 ? (
                            <div className="p-12 text-center text-slate-500">
                                No drafts found. Run the extraction pipeline to generate new digests.
                            </div>
                        ) : (
                            drafts.map(draft => (
                                <div key={draft.id} className="p-6 flex flex-col md:flex-row gap-4 items-center justify-between hover:bg-slate-800/30 transition-colors">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-3 mb-1">
                                            {draft.status === 'sent' ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 ring-1 ring-inset ring-emerald-500/30 flex items-center">
                                                    <Check className="w-3 h-3 mr-1" /> Sent
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 ring-1 ring-inset ring-amber-500/30 flex items-center">
                                                    <Clock className="w-3 h-3 mr-1" /> Draft
                                                </span>
                                            )}
                                            <span className="text-sm text-slate-400">
                                                {new Date(draft.created_at).toLocaleDateString()} at {new Date(draft.created_at).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        <h3 className="text-lg font-medium text-white truncate">{draft.subject}</h3>
                                    </div>

                                    <div className="flex items-center space-x-3 shrink-0">
                                        <button
                                            onClick={() => setPreviewDraft(draft)}
                                            className="px-4 py-2 text-sm font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                                        >
                                            Preview
                                        </button>

                                        {draft.status === 'draft' && (
                                            <>
                                                <button
                                                    onClick={() => handleAction(draft.id, 'delete')}
                                                    disabled={actionLoading === draft.id}
                                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(draft.id, 'send')}
                                                    disabled={actionLoading === draft.id}
                                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition shadow-lg shadow-emerald-900/20 flex items-center"
                                                >
                                                    <Send className="w-4 h-4 mr-2" />
                                                    {actionLoading === draft.id ? 'Sending...' : 'Broadcast'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Preview Modal */}
            {previewDraft && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
                            <h3 className="font-semibold text-lg text-white">Preview: {previewDraft.subject}</h3>
                            <button onClick={() => setPreviewDraft(null)} className="text-slate-400 hover:text-white transition">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto bg-white">
                            <iframe
                                srcDoc={previewDraft.html_content}
                                className="w-full h-[70vh] border-0"
                                title="Email Preview"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
