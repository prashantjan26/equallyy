'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Users, Plus, Search, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'

// Emoji & gradient per group type
const TYPE_META: Record<string, { emoji: string; label: string; gradient: string; query: string }> = {
    trip:     { emoji: '✈️', label: 'Trip',     gradient: 'from-indigo-900/80 via-indigo-800/60 to-transparent', query: 'travel,adventure' },
    food:     { emoji: '🍽️', label: 'Food',     gradient: 'from-orange-900/80 via-orange-800/60 to-transparent', query: 'food,restaurant' },
    home:     { emoji: '🏠', label: 'Home',     gradient: 'from-emerald-900/80 via-emerald-800/60 to-transparent', query: 'home,living' },
    work:     { emoji: '💼', label: 'Work',     gradient: 'from-blue-900/80 via-blue-800/60 to-transparent', query: 'office,work' },
    party:    { emoji: '🎉', label: 'Party',    gradient: 'from-pink-900/80 via-pink-800/60 to-transparent', query: 'party,celebration' },
    beach:    { emoji: '🏖️', label: 'Beach',    gradient: 'from-cyan-900/80 via-cyan-800/60 to-transparent', query: 'beach,ocean' },
    mountain: { emoji: '⛰️', label: 'Mountain', gradient: 'from-green-900/80 via-green-800/60 to-transparent', query: 'mountain,nature' },
    other:    { emoji: '👥', label: 'Group',    gradient: 'from-violet-900/80 via-violet-800/60 to-transparent', query: 'city,urban' },
}

const FALLBACK_GRADIENTS: Record<string, string> = {
    trip:     'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e1b4b 100%)',
    food:     'linear-gradient(135deg, #431407 0%, #7c2d12 50%, #431407 100%)',
    home:     'linear-gradient(135deg, #052e16 0%, #14532d 50%, #052e16 100%)',
    work:     'linear-gradient(135deg, #0c1445 0%, #1e3a8a 50%, #0c1445 100%)',
    party:    'linear-gradient(135deg, #500724 0%, #9f1239 50%, #500724 100%)',
    beach:    'linear-gradient(135deg, #0c4a6e 0%, #0369a1 50%, #0c4a6e 100%)',
    mountain: 'linear-gradient(135deg, #052e16 0%, #166534 50%, #052e16 100%)',
    other:    'linear-gradient(135deg, #2e1065 0%, #4c1d95 50%, #2e1065 100%)',
}

function getTypeMeta(type: string) {
    return TYPE_META[type?.toLowerCase()] ?? TYPE_META['other']
}

function getFallbackGradient(type: string) {
    return FALLBACK_GRADIENTS[type?.toLowerCase()] ?? FALLBACK_GRADIENTS['other']
}

function getImageUrl(groupName: string, type: string) {
    const meta = getTypeMeta(type)
    const q = encodeURIComponent(`${groupName},${meta.query}`)
    return `https://source.unsplash.com/featured/800x400/?${q}`
}

// Stable color per group name for avatar
const AVATAR_COLORS = [
    '#4f46e5', '#7c3aed', '#db2777', '#ea580c', '#0891b2', '#059669',
]
function getAvatarColor(name: string) {
    let hash = 0
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export default function GroupsPage() {
    const [groups, setGroups] = useState<any[]>([])
    const [memberCounts, setMemberCounts] = useState<Record<string, number>>({})
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const supabase = createClient()

    useEffect(() => { fetchGroups() }, [])

    async function fetchGroups() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('group_members')
            .select('group_id, groups(*)')
            .eq('user_id', user.id)

        if (data) {
            const groupList = data.map((d: any) => d.groups).filter(Boolean)
            setGroups(groupList)

            const counts: Record<string, number> = {}
            await Promise.all(groupList.map(async (g: any) => {
                const { count } = await supabase
                    .from('group_members')
                    .select('*', { count: 'exact', head: true })
                    .eq('group_id', g.id)
                counts[g.id] = count || 0
            }))
            setMemberCounts(counts)
        }
        setLoading(false)
    }

    const filteredGroups = groups.filter(g =>
        !searchQuery || g.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="p-4 pt-10 space-y-4">
                <div className="h-10 bg-gray-900 rounded-2xl animate-pulse w-40" />
                <div className="h-10 bg-gray-900 rounded-2xl animate-pulse" />
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-44 bg-gray-900 rounded-3xl animate-pulse" />
                ))}
            </div>
        )
    }

    return (
        <>
            {/* Injected keyframes */}
            <style>{`
                @keyframes floatUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes floatBob {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-5px); }
                }
                .group-card-enter {
                    animation: floatUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                .group-card-bob {
                    animation: floatBob 3.5s ease-in-out infinite;
                }
            `}</style>

            <div className="p-4 space-y-5 bg-gray-950">
                {/* Header */}
                <div className="pt-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic">Groups</h1>
                        <p className="text-gray-500 text-sm font-medium">
                            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setShowSearch(v => !v); setSearchQuery('') }}
                            className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition"
                        >
                            {showSearch ? <X size={18} /> : <Search size={18} />}
                        </button>
                        <Link href="/dashboard/groups/new">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-1.5">
                                <Plus size={18} strokeWidth={3} />
                                New
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
                            placeholder="Search groups..."
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

                {/* Empty state */}
                {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
                        <div className="text-6xl mb-6">✈️</div>
                        <h2 className="text-xl font-bold text-white mb-2">No groups yet</h2>
                        <p className="text-gray-500 text-sm mb-8 max-w-[240px] leading-relaxed">
                            Create a group and start splitting expenses on your next adventure.
                        </p>
                        <Link href="/dashboard/groups/new">
                            <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl h-12 px-8 font-bold shadow-xl shadow-indigo-500/30">
                                Create first group
                            </Button>
                        </Link>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Search size={32} className="text-gray-700 mb-3" />
                        <p className="text-white font-bold">No results for "{searchQuery}"</p>
                        <p className="text-gray-500 text-sm mt-1">Try a different name</p>
                    </div>
                ) : (
                    <div className="space-y-5">
                        {filteredGroups.map((group: any, index: number) => {
                            const meta = getTypeMeta(group.type)
                            const memberCount = memberCounts[group.id]
                            const avatarColor = getAvatarColor(group.name || '')
                            const initials = (group.name || 'GR').slice(0, 2).toUpperCase()
                            const imageUrl = getImageUrl(group.name || '', group.type || 'other')
                            const imgFailed = imgErrors[group.id]

                            return (
                                <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
                                    <div
                                        className="group-card-enter group-card-bob relative rounded-3xl overflow-hidden cursor-pointer"
                                        style={{
                                            animationDelay: `${index * 80}ms`,
                                            // stagger the bob so cards don't all float together
                                            animationDuration: index % 2 === 0 ? '3.5s' : '4.2s',
                                            minHeight: '180px',
                                        }}
                                    >
                                        {/* Background image or fallback gradient */}
                                        {!imgFailed ? (
                                            <img
                                                src={imageUrl}
                                                alt={group.name}
                                                onError={() => setImgErrors(prev => ({ ...prev, [group.id]: true }))}
                                                className="absolute inset-0 w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div
                                                className="absolute inset-0"
                                                style={{ background: getFallbackGradient(group.type) }}
                                            />
                                        )}

                                        {/* Dark gradient overlay for readability */}
                                        <div className={`absolute inset-0 bg-gradient-to-t ${meta.gradient} from-black/80 via-black/40 to-transparent`} />

                                        {/* Hover glow ring */}
                                        <div className="absolute inset-0 rounded-3xl ring-0 group-hover:ring-2 ring-white/20 transition-all duration-300" />

                                        {/* Hover scale wrapper */}
                                        <div className="relative h-full p-5 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.015]"
                                            style={{ minHeight: '180px' }}>
                                            {/* Top row: emoji badge + member chip */}
                                            <div className="flex items-start justify-between">
                                                {/* Group type pill */}
                                                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1">
                                                    <span className="text-sm">{meta.emoji}</span>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{meta.label}</span>
                                                </div>

                                                {/* Member count chip */}
                                                {memberCount !== undefined && (
                                                    <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
                                                        <Users size={10} className="text-gray-300" />
                                                        <span className="text-[10px] font-bold text-gray-200">{memberCount}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Bottom: avatar + name + arrow */}
                                            <div className="flex items-end justify-between mt-auto">
                                                <div className="flex items-center gap-3">
                                                    {/* Avatar */}
                                                    <div
                                                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-lg"
                                                        style={{ backgroundColor: avatarColor + '33', border: `1.5px solid ${avatarColor}66` }}
                                                    >
                                                        <span className="text-sm font-black text-white">{initials}</span>
                                                    </div>
                                                    <div>
                                                        <h3 className="text-white font-black text-lg leading-tight drop-shadow-md">{group.name}</h3>
                                                        {memberCount !== undefined && (
                                                            <p className="text-gray-300 text-xs font-medium mt-0.5">
                                                                {memberCount} {memberCount === 1 ? 'member' : 'members'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="w-8 h-8 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                                                    <ChevronRight size={15} className="text-white" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            )
                        })}
                    </div>
                )}
            </div>
        </>
    )
}