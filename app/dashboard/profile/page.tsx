'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { User, Mail, Smartphone, Edit2, LogOut, Check, X, Shield, ChevronRight } from 'lucide-react'

export default function ProfilePage() {
    const supabase = createClient()
    const router = useRouter()

    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [isEditingName, setIsEditingName] = useState(false)
    const [editName, setEditName] = useState('')
    const [isEditingUpi, setIsEditingUpi] = useState(false)
    const [editUpi, setEditUpi] = useState('')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    useEffect(() => { fetchProfile() }, [])

    async function fetchProfile() {
        setLoading(true)
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
            setUser(authUser)
            const { data: userProfile } = await supabase.from('users').select('*').eq('id', authUser.id).single()
            if (userProfile) { setProfile(userProfile); setEditName(userProfile.name || ''); setEditUpi(userProfile.upi_id || '') }
        }
        setLoading(false)
    }

    async function handleSaveName() {
        if (!editName.trim()) return
        setSaving(true); setError(null); setSuccess(null)
        const { error: e } = await supabase.from('users').update({ name: editName }).eq('id', user.id)
        if (e) { setError(e.message) } else { setProfile({ ...profile, name: editName }); setSuccess('Name updated!'); setIsEditingName(false) }
        setSaving(false)
        setTimeout(() => setSuccess(null), 3000)
    }

    async function handleSaveUpi() {
        setSaving(true); setError(null); setSuccess(null)
        const { error: e } = await supabase.from('users').update({ upi_id: editUpi }).eq('id', user.id)
        if (e) { setError(e.message) } else { setProfile({ ...profile, upi_id: editUpi }); setSuccess('UPI ID updated!'); setIsEditingUpi(false) }
        setSaving(false)
        setTimeout(() => setSuccess(null), 3000)
    }

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    if (loading) {
        return (
            <div className="p-4 pt-10 space-y-4">
                <div className="flex flex-col items-center gap-3 py-8">
                    <div className="w-24 h-24 bg-gray-900 rounded-full animate-pulse" />
                    <div className="h-5 w-32 bg-gray-900 rounded animate-pulse" />
                    <div className="h-4 w-44 bg-gray-900 rounded animate-pulse" />
                </div>
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />)}
            </div>
        )
    }

    const initial = profile?.name ? profile.name[0].toUpperCase() : user?.email?.[0]?.toUpperCase() || '?'
    const displayName = profile?.name || user?.email?.split('@')[0] || 'Unknown'

    // Stable color from name
    const COLORS = ['#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#059669']
    const colorIdx = (displayName.charCodeAt(0) || 0) % COLORS.length
    const avatarColor = COLORS[colorIdx]

    return (
        <>
            <style>{`
                @keyframes floatUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .fade-up   { animation: floatUp 0.45s cubic-bezier(0.22,1,0.36,1) both; }
                .fade-up-1 { animation: floatUp 0.45s 60ms  cubic-bezier(0.22,1,0.36,1) both; }
                .fade-up-2 { animation: floatUp 0.45s 120ms cubic-bezier(0.22,1,0.36,1) both; }
                .fade-up-3 { animation: floatUp 0.45s 180ms cubic-bezier(0.22,1,0.36,1) both; }
            `}</style>

            <div className="bg-gray-950 min-h-screen pb-32">
                {/* Hero avatar section */}
                <div className="relative px-4 pt-10 pb-8 flex flex-col items-center text-center fade-up overflow-hidden">
                    {/* Glow blob behind avatar */}
                    <div className="absolute inset-0 flex items-start justify-center pt-6 pointer-events-none">
                        <div className="w-40 h-40 rounded-full blur-3xl opacity-20" style={{ backgroundColor: avatarColor }} />
                    </div>

                    {/* Avatar */}
                    <div
                        className="relative w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-2xl border-2 mb-4"
                        style={{ backgroundColor: avatarColor + '33', borderColor: avatarColor + '66' }}
                    >
                        {initial}
                        <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full border-2 border-gray-950 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-white rounded-full" />
                        </div>
                    </div>

                    <h1 className="text-2xl font-black text-white tracking-tight">{displayName}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">{user?.email}</p>

                    {/* Status messages */}
                    {error && <div className="mt-3 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-xl text-sm w-full">{error}</div>}
                    {success && <div className="mt-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-xl text-sm w-full">{success}</div>}
                </div>

                {/* Info section */}
                <div className="px-4 space-y-3 fade-up-1">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Personal Info</p>

                    {/* Name field */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center shrink-0">
                                <User size={16} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Full Name</p>
                                {isEditingName ? (
                                    <input
                                        type="text" value={editName} onChange={e => setEditName(e.target.value)} autoFocus
                                        className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-sm w-full focus:outline-none focus:border-indigo-500"
                                    />
                                ) : (
                                    <p className="text-white text-sm font-bold truncate">{profile?.name || 'Not set'}</p>
                                )}
                            </div>
                            <div className="shrink-0">
                                {isEditingName ? (
                                    <div className="flex items-center gap-1">
                                        <button onClick={handleSaveName} disabled={saving} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition">
                                            <Check size={15} />
                                        </button>
                                        <button onClick={() => { setIsEditingName(false); setEditName(profile?.name || '') }} disabled={saving} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition">
                                            <X size={15} />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingName(true)} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition">
                                        <Edit2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Email */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center shrink-0">
                                <Mail size={16} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">Email</p>
                                <p className="text-white text-sm font-bold truncate">{user?.email}</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                                <Shield size={10} className="text-indigo-400" />
                            </div>
                        </div>
                    </div>

                    {/* UPI */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-800 border border-gray-700 rounded-xl flex items-center justify-center shrink-0">
                                <Smartphone size={16} className="text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-0.5">UPI ID</p>
                                {isEditingUpi ? (
                                    <input
                                        type="text" value={editUpi} onChange={e => setEditUpi(e.target.value)} autoFocus
                                        placeholder="e.g. name@upi"
                                        className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-white text-sm w-full focus:outline-none focus:border-indigo-500"
                                    />
                                ) : (
                                    <p className="text-white text-sm font-bold truncate">{profile?.upi_id || 'Not set'}</p>
                                )}
                            </div>
                            <div className="shrink-0">
                                {isEditingUpi ? (
                                    <div className="flex items-center gap-1">
                                        <button onClick={handleSaveUpi} disabled={saving} className="p-2 text-emerald-400 hover:bg-emerald-400/10 rounded-xl transition">
                                            <Check size={15} />
                                        </button>
                                        <button onClick={() => { setIsEditingUpi(false); setEditUpi(profile?.upi_id || '') }} disabled={saving} className="p-2 text-red-400 hover:bg-red-400/10 rounded-xl transition">
                                            <X size={15} />
                                        </button>
                                    </div>
                                ) : (
                                    <button onClick={() => setIsEditingUpi(true)} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-xl transition">
                                        <Edit2 size={15} />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sign out */}
                <div className="px-4 mt-8 fade-up-3">
                    <button
                        onClick={handleSignOut}
                        className="w-full bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 rounded-2xl h-12 font-bold flex items-center justify-center gap-2 transition active:scale-[0.98]"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </div>
        </>
    )
}
