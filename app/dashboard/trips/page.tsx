'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus, Map, Calendar, Users, Plane, Search, X, MoreVertical, Pencil, Trash2, AlertTriangle, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Tab = 'upcoming' | 'past' | 'all'

const DEST_META: Record<string, { gradient: string; query: string }> = {
    beach:    { gradient: 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#075985 100%)', query: 'beach,ocean,tropical' },
    mountain: { gradient: 'linear-gradient(135deg,#052e16 0%,#166534 60%,#14532d 100%)', query: 'mountain,nature,trekking' },
    city:     { gradient: 'linear-gradient(135deg,#2e1065 0%,#4c1d95 60%,#3b0764 100%)', query: 'city,urban,skyline' },
    default:  { gradient: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 60%,#1e1b4b 100%)', query: 'travel,adventure,landscape' },
}

function getDestMeta(destination: string) {
    const d = destination.toLowerCase()
    if (d.match(/beach|goa|bali|phuket|maldives|ocean|sea|coast/)) return DEST_META.beach
    if (d.match(/mountain|hill|rishikesh|manali|shimla|ladakh|trek|himalaya|alps|coorg|ooty/)) return DEST_META.mountain
    if (d.match(/city|mumbai|delhi|bangalore|tokyo|paris|london|dubai|urban|hyderabad|pune|chennai/)) return DEST_META.city
    return DEST_META.default
}

function getImageUrl(destination: string) {
    const meta = getDestMeta(destination)
    return `https://source.unsplash.com/featured/800x400/?${encodeURIComponent(destination + ',' + meta.query)}`
}

export default function TripsPage() {
    const supabase = createClient()
    const router = useRouter()
    const [trips, setTrips] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<Tab>('upcoming')
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})

    // Delete flow
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
    const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
    const [deleteTargetName, setDeleteTargetName] = useState('')
    const [deleting, setDeleting] = useState(false)

    useEffect(() => { fetchTrips() }, [])

    async function fetchTrips() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userGroups } = await supabase
            .from('group_members')
            .select('group_id')
            .eq('user_id', user.id)

        const groupIds = userGroups?.map(g => g.group_id) || []

        const { data, error } = await supabase
            .from('trips')
            .select('*, groups(*)')
            .or(`group_id.in.(${groupIds.join(',') || 'NULL'}),user_id.eq.${user.id}`)
            .order('start_date', { ascending: true })

        if (!error && data) setTrips(data)
        setLoading(false)
    }

    async function deleteTrip(id: string) {
        setDeleting(true)
        const { error } = await supabase.from('trips').delete().eq('id', id)
        if (!error) setTrips(prev => prev.filter(t => t.id !== id))
        setDeleting(false)
        setDeleteTargetId(null)
        setMenuOpenId(null)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const filteredByTab = trips.filter(trip => {
        const end = new Date(trip.end_date)
        if (activeTab === 'upcoming') return end >= today
        if (activeTab === 'past') return end < today
        return true
    })

    const filteredTrips = filteredByTab.filter(trip =>
        !searchQuery || trip.destination.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const tabs: { key: Tab; label: string }[] = [
        { key: 'upcoming', label: 'Upcoming' },
        { key: 'past', label: 'Past' },
        { key: 'all', label: 'All' },
    ]

    if (loading) {
        return (
            <div className="p-4 pt-10 space-y-4">
                <div className="h-10 bg-gray-900 rounded-2xl animate-pulse w-32" />
                <div className="h-10 bg-gray-900 rounded-2xl animate-pulse" />
                {[1, 2, 3].map(i => <div key={i} className="h-44 bg-gray-900 rounded-3xl animate-pulse" />)}
            </div>
        )
    }

    return (
        <>
            <style>{`
                @keyframes floatUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes floatBob {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-5px); }
                }
                .card-enter { animation: floatUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
                .card-bob   { animation: floatBob 3.5s ease-in-out infinite; }
            `}</style>

            <div className="p-4 space-y-5 bg-gray-950 pb-32">
                {/* Header */}
                <div className="pt-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic">My Trips</h1>
                        <p className="text-gray-500 text-sm font-medium">{trips.length} {trips.length === 1 ? 'trip' : 'trips'} total</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setShowSearch(v => !v); setSearchQuery('') }}
                            className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition"
                        >
                            {showSearch ? <X size={18} /> : <Search size={18} />}
                        </button>
                        <Link href="/dashboard/trips/new">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 font-bold shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-1.5">
                                <Plus size={18} strokeWidth={3} />
                                Plan
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search */}
                {showSearch && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search destination..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-9 pr-9 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1">
                    {tabs.map(tab => {
                        const count = tab.key === 'all' ? trips.length : trips.filter(t => {
                            const end = new Date(t.end_date)
                            return tab.key === 'upcoming' ? end >= today : end < today
                        }).length
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-bold transition-all ${activeTab === tab.key
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={`ml-1.5 text-[10px] font-black ${activeTab === tab.key ? 'text-indigo-200' : 'text-gray-600'}`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        )
                    })}
                </div>

                {/* Trip Cards */}
                {filteredTrips.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        {searchQuery ? (
                            <>
                                <Search size={36} className="text-gray-700 mb-4" />
                                <p className="text-white font-bold text-lg">No results for "{searchQuery}"</p>
                            </>
                        ) : activeTab === 'past' ? (
                            <>
                                <div className="text-6xl mb-5">✈️</div>
                                <p className="text-white font-bold text-lg">No past trips</p>
                                <p className="text-gray-500 text-sm mt-1">Your completed trips will appear here</p>
                            </>
                        ) : (
                            <>
                                <div className="text-6xl mb-5 animate-bounce">✈️</div>
                                <h2 className="text-2xl font-bold text-white mb-2">No trips planned yet</h2>
                                <p className="text-gray-500 text-sm mb-8 max-w-[260px] leading-relaxed">
                                    Start planning your next adventure. AI will estimate the perfect budget.
                                </p>
                                <Link href="/dashboard/trips/new">
                                    <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl h-12 px-10 font-bold shadow-xl shadow-indigo-500/30">
                                        Start Planning
                                    </Button>
                                </Link>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-5">
                        {filteredTrips.map((trip, index) => {
                            const startDate = new Date(trip.start_date)
                            const endDate = new Date(trip.end_date)
                            const isPast = endDate < today
                            const totalBudget = trip.ai_budget_estimate?.total || (trip.ai_budget_estimate?.total_per_person * trip.members_count) || 0
                            const perPersonBudget = trip.ai_budget_estimate?.per_person_total || trip.ai_budget_estimate?.total_per_person || 0
                            const imageUrl = getImageUrl(trip.destination)
                            const imgFailed = imgErrors[trip.id]
                            const destMeta = getDestMeta(trip.destination)
                            const isMenuOpen = menuOpenId === trip.id
                            const delay = index * 80
                            const bobDuration = index % 2 === 0 ? '3.5s' : '4.2s'

                            return (
                                <div key={trip.id} className="relative">
                                    {/* 3-dot menu */}
                                    {isMenuOpen && (
                                        <div
                                            className="absolute top-14 right-4 z-30 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden min-w-[160px]"
                                            onClick={e => e.stopPropagation()}
                                        >
                                            <button
                                                onClick={() => { setMenuOpenId(null); router.push(`/dashboard/trips/${trip.id}/edit`) }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-200 hover:bg-gray-700 transition"
                                            >
                                                <Pencil size={15} className="text-indigo-400" /> Edit Trip
                                            </button>
                                            <div className="h-px bg-gray-700" />
                                            <button
                                                onClick={() => { setDeleteTargetId(trip.id); setDeleteTargetName(trip.destination); setMenuOpenId(null) }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition"
                                            >
                                                <Trash2 size={15} /> Delete Trip
                                            </button>
                                        </div>
                                    )}

                                    <div
                                        className={`card-enter card-bob relative rounded-3xl overflow-hidden cursor-pointer ${isPast ? 'opacity-60' : ''}`}
                                        style={{ animationDelay: `${delay}ms`, animationDuration: bobDuration, minHeight: '180px' }}
                                        onClick={() => { if (menuOpenId) { setMenuOpenId(null); return } router.push(`/dashboard/trips/${trip.id}`) }}
                                    >
                                        {/* Background */}
                                        {!imgFailed ? (
                                            <img
                                                src={imageUrl}
                                                alt={trip.destination}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                onError={() => setImgErrors(prev => ({ ...prev, [trip.id]: true }))}
                                            />
                                        ) : (
                                            <div className="absolute inset-0" style={{ background: destMeta.gradient }} />
                                        )}

                                        {/* Dark overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
                                        {/* Hover glow */}
                                        <div className="absolute inset-0 rounded-3xl ring-0 hover:ring-2 ring-white/20 transition-all duration-300" />

                                        <div className="relative p-5 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.015]"
                                            style={{ minHeight: '180px' }}>
                                            {/* Top row */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {isPast && (
                                                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
                                                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Past</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1">
                                                        <span className="text-sm">✈️</span>
                                                        <span className="text-[9px] font-black text-white uppercase tracking-widest">{trip.budget_tier || 'Trip'}</span>
                                                    </div>
                                                    {trip.groups && (
                                                        <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2 py-1">
                                                            <Users size={9} className="text-indigo-300" />
                                                            <span className="text-[9px] font-bold text-indigo-200">{trip.groups.name}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                {/* 3-dot menu button */}
                                                <button
                                                    className="w-8 h-8 rounded-xl bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center text-gray-300 hover:text-white transition shrink-0"
                                                    onClick={e => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : trip.id) }}
                                                >
                                                    <MoreVertical size={15} />
                                                </button>
                                            </div>

                                            {/* Bottom */}
                                            <div className="mt-auto">
                                                <h3 className="text-white font-black text-2xl leading-tight drop-shadow-md mb-2">{trip.destination}</h3>
                                                <div className="flex items-end justify-between">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1">
                                                            <Calendar size={11} className="text-gray-300" />
                                                            <span className="text-[10px] font-bold text-gray-200">
                                                                {startDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {endDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-xl px-2.5 py-1">
                                                            <Users size={11} className="text-gray-300" />
                                                            <span className="text-[10px] font-bold text-gray-200">{trip.members_count}p</span>
                                                        </div>
                                                    </div>
                                                    {totalBudget > 0 && (
                                                        <div className="text-right">
                                                            <div className="text-xl font-black text-emerald-400 drop-shadow-sm">₹{totalBudget.toLocaleString('en-IN')}</div>
                                                            {perPersonBudget > 0 && (
                                                                <div className="text-[10px] text-gray-400">₹{perPersonBudget.toLocaleString('en-IN')}/person</div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Backdrop for menu close */}
                {menuOpenId && <div className="fixed inset-0 z-20" onClick={() => setMenuOpenId(null)} />}

                {/* Delete confirmation modal */}
                {deleteTargetId && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
                        <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-2xl w-full max-w-xs">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                                    <AlertTriangle size={16} className="text-red-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-sm">Delete "{deleteTargetName}"?</p>
                                    <p className="text-gray-500 text-xs mt-0.5">This cannot be undone.</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => setDeleteTargetId(null)} className="flex-1 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-bold transition">
                                    Cancel
                                </button>
                                <button onClick={() => deleteTrip(deleteTargetId!)} disabled={deleting} className="flex-1 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition disabled:opacity-50">
                                    {deleting ? '...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    )
}
