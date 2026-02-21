'use client';

import { useState, useEffect } from 'react';
import { Mail, Check, Trash2, Send, Clock, X, AlertCircle } from 'lucide-react';

interface Draft {
    id: string;
    subject: string;
    html_content: string;
    status: 'draft' | 'sent';
    created_at: string;
    sent_at: string | null;
}

export default function AdminDashboard() {
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [previewDraft, setPreviewDraft] = useState<Draft | null>(null);

    useEffect(() => {
        fetchDrafts();
    }, []);

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
        if (action === 'send' && !confirm('Are you absolutely sure you want to broadcast this email to all subscribers?')) {
            return;
        }
        if (action === 'delete' && !confirm('Delete this draft permanently?')) {
            return;
        }

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
            console.error(`Failed to ${action} draft`, error);
            alert("Network error occurred.");
        } finally {
            setActionLoading(null);
        }
    };

    if (loading) return <div className="min-h-screen bg-[#020617] text-white flex items-center justify-center">Loading Admin...</div>;

    return (
        <div className="min-h-screen bg-[#020617] text-slate-100 font-sans p-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center space-x-3 mb-8">
                    <AlertCircle className="w-8 h-8 text-rose-500" />
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
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
                        <div className="flex-1 overflow-y-auto p-0 bg-white">
                            {/* Render the raw HTML safely inside an iframe for CSS isolation */}
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
