'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { X, ChevronRight, ArrowLeft, Users, User, Wallet, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface AddExpenseSheetProps {
    isOpen: boolean
    onClose: () => void
}

type Step = 'main' | 'groups' | 'friends'

export default function AddExpenseSheet({ isOpen, onClose }: AddExpenseSheetProps) {
    const [step, setStep] = useState<Step>('main')
    const [groups, setGroups] = useState<any[]>([])
    const [friends, setFriends] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => {
        if (isOpen) {
            setStep('main')
            fetchData()
        }
    }, [isOpen])

    async function fetchData() {
        setLoading(true)
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch groups
        const { data: userGroups } = await supabase
            .from('group_members')
            .select('group_id, groups(id, name, type)')
            .eq('user_id', user.id)

        if (userGroups) {
            const groupList = userGroups.map((g: any) => g.groups).filter(Boolean)
            setGroups(groupList)

            // Fetch members and guests for deduplicated friends list
            const groupIds = userGroups.map((g: any) => g.group_id)
            if (groupIds.length > 0) {
                const { data: members } = await supabase
                    .from('group_members')
                    .select('*, users(id, name, email)')
                    .in('group_id', groupIds)

                if (members) {
                    const friendMap = new Map()
                    members.forEach((m: any) => {
                        const key = m.user_id || m.guest_name
                        if (m.user_id === user.id) return // Skip self
                        
                        if (!friendMap.has(key)) {
                            friendMap.set(key, {
                                id: m.user_id,
                                name: m.is_guest ? m.guest_name : (m.users?.name || m.users?.email?.split('@')[0]),
                                is_guest: m.is_guest,
                                email: m.users?.email
                            })
                        }
                    })
                    setFriends(Array.from(friendMap.values()).sort((a,b) => a.name.localeCompare(b.name)))
                }
            }
        }
        setLoading(false)
    }

    if (!isOpen) return null

    const handleNavigate = (path: string) => {
        onClose()
        router.push(path)
    }

    return (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                .animate-slide-up {
                    animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                }
                .animate-fade-in {
                    animation: fadeIn 0.2s ease-out;
                }
            `}</style>
            
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative bg-gray-900 rounded-t-3xl px-5 pt-3 pb-10 shadow-2xl animate-slide-up max-h-[85vh] overflow-hidden flex flex-col">
                <div className="w-12 h-1.5 bg-gray-800 rounded-full mx-auto mb-6 shrink-0" />

                <div className="flex items-center justify-between mb-6 shrink-0 px-1">
                    <div className="flex items-center gap-3">
                        {step !== 'main' && (
                            <button onClick={() => setStep('main')} className="p-2 -ml-2 text-gray-400 hover:text-white transition">
                                <ArrowLeft size={20} />
                            </button>
                        )}
                        <div>
                            <h2 className="text-white font-black text-xl italic tracking-tight">
                                {step === 'main' ? 'Where to add expense?' : step === 'groups' ? 'Select a Group' : 'Select a Friend'}
                            </h2>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar pb-2">
                    {step === 'main' && (
                        <div className="space-y-3">
                            {/* Group Option */}
                            <button
                                onClick={() => setStep('groups')}
                                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-800 hover:border-indigo-500/30 rounded-2xl transition-all group"
                            >
                                <div className="w-12 h-12 bg-indigo-500/20 border border-indigo-500/30 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-indigo-400">
                                    <Users size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-bold text-base">A Group</p>
                                    <p className="text-gray-500 text-xs mt-0.5">Split with roommates, travel buds, etc.</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-600 transition-transform group-hover:translate-x-1" />
                            </button>

                            {/* Personal Option */}
                            <button
                                onClick={() => handleNavigate('/dashboard/personal/add')}
                                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500/30 rounded-2xl transition-all group"
                            >
                                <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-emerald-400">
                                    <Wallet size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-bold text-base">Personal</p>
                                    <p className="text-gray-500 text-xs mt-0.5">Keep it private, no split</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-600 transition-transform group-hover:translate-x-1" />
                            </button>

                            {/* Friend Option */}
                            <button
                                onClick={() => setStep('friends')}
                                className="w-full flex items-center gap-4 p-4 bg-gray-800/50 hover:bg-gray-800 border border-gray-800 hover:border-amber-500/30 rounded-2xl transition-all group"
                            >
                                <div className="w-12 h-12 bg-amber-500/20 border border-amber-500/30 rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform text-amber-400">
                                    <User size={24} />
                                </div>
                                <div className="text-left flex-1">
                                    <p className="text-white font-bold text-base">A Friend / Guest</p>
                                    <p className="text-gray-500 text-xs mt-0.5">Quick split with any individual</p>
                                </div>
                                <ChevronRight size={18} className="text-gray-600 transition-transform group-hover:translate-x-1" />
                            </button>
                        </div>
                    )}

                    {step === 'groups' && (
                        <div className="space-y-2 animate-fade-in">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                                    <p className="text-gray-500 text-sm mt-4">Loading your groups...</p>
                                </div>
                            ) : groups.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-gray-400">No groups found</p>
                                    <button onClick={() => handleNavigate('/dashboard/groups/new')} className="mt-4 text-indigo-400 font-bold text-sm">Create a group</button>
                                </div>
                            ) : (
                                groups.map((g: any) => {
                                    const initial = g.name?.[0].toUpperCase()
                                    return (
                                        <button
                                            key={g.id}
                                            onClick={() => handleNavigate(`/dashboard/groups/${g.id}/add-expense`)}
                                            className="w-full flex items-center gap-3 p-3 bg-gray-800/30 hover:bg-gray-800 border border-transparent hover:border-gray-700 rounded-2xl transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-indigo-600/20 text-indigo-300 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                                                {initial}
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <p className="text-white font-bold text-sm truncate">{g.name}</p>
                                                <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold opacity-80">{g.type || 'Group'}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-600" />
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    )}

                    {step === 'friends' && (
                        <div className="space-y-2 animate-fade-in">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                                    <p className="text-gray-500 text-sm mt-4">Finding friends...</p>
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="text-center py-10 px-6">
                                    <p className="text-gray-400">No friends or guests found</p>
                                    <p className="text-gray-600 text-xs mt-1">Start by adding people to a group</p>
                                </div>
                            ) : (
                                friends.map((f: any, i) => {
                                    const initial = f.name?.[0].toUpperCase() || '?'
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => handleNavigate(`/dashboard/personal/add?friend=${encodeURIComponent(f.name)}&friend_id=${f.id || ''}`)}
                                            className="w-full flex items-center gap-3 p-3 bg-gray-800/30 hover:bg-gray-800 border border-transparent hover:border-gray-700 rounded-2xl transition-all group"
                                        >
                                            <div className="w-10 h-10 bg-amber-600/20 text-amber-300 rounded-xl flex items-center justify-center font-black text-sm shrink-0 uppercase">
                                                {initial}
                                            </div>
                                            <div className="text-left flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-white font-bold text-sm truncate">{f.name}</p>
                                                    {f.is_guest && <span className="text-[8px] bg-gray-800 border border-gray-700 text-gray-400 px-1.5 py-0.5 rounded-full font-black uppercase">Guest</span>}
                                                </div>
                                                <p className="text-gray-500 text-[10px] truncate">{f.email || 'Friend'}</p>
                                            </div>
                                            <ChevronRight size={14} className="text-gray-600" />
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
