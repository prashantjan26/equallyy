'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Users, Wallet, TrendingUp, Plus, Utensils, Car, Building2, Map, ShoppingBag, MoreHorizontal, Plane, Calendar, ChevronRight, ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import AddExpenseSheet from '@/components/AddExpenseSheet'

const CATEGORY_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
    Food: { icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/20' },
    Transport: { icon: Car, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    Hotel: { icon: Building2, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    Activities: { icon: Map, color: 'text-green-400', bg: 'bg-green-500/20' },
    Shopping: { icon: ShoppingBag, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    Other: { icon: MoreHorizontal, color: 'text-gray-400', bg: 'bg-gray-500/20' },
}

function getGreeting() {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
}

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null)
    const [balances, setBalances] = useState({ owed: 0, owe: 0 })
    const [peopleWhoOweYou, setPeopleWhoOweYou] = useState<any[]>([])
    const [peopleYouOwe, setPeopleYouOwe] = useState<any[]>([])
    const [recentActivity, setRecentActivity] = useState<any[]>([])
    const [allMembers, setAllMembers] = useState<any[]>([])
    const [upcomingTrips, setUpcomingTrips] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    useEffect(() => { fetchDashboardData() }, [])

    async function fetchDashboardData() {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) { setLoading(false); return }
        setUser(currentUser)

        const { data: userGroups } = await supabase
            .from('group_members').select('group_id').eq('user_id', currentUser.id)

        const today = new Date().toISOString().split('T')[0]
        const { data: tripsData } = await supabase
            .from('trips').select('*, groups(name)')
            .gte('end_date', today)
            .or(userGroups && userGroups.length > 0
                ? `user_id.eq.${currentUser.id},group_id.in.(${userGroups.map(g => g.group_id).join(',')})`
                : `user_id.eq.${currentUser.id}`)
            .order('start_date', { ascending: true }).limit(2)
        setUpcomingTrips(tripsData || [])

        if (!userGroups || userGroups.length === 0) { setLoading(false); return }
        const groupIds = userGroups.map(g => g.group_id)

        const { data: allMembersData } = await supabase
            .from('group_members').select('*, users(name, email)').in('group_id', groupIds)
        setAllMembers(allMembersData || [])

        const { data: expenses } = await supabase
            .from('expenses').select('*, expense_splits(*), groups(name)')
            .in('group_id', groupIds).order('created_at', { ascending: false })

        setRecentActivity(expenses?.slice(0, 5) || [])

        let owed = 0, owe = 0
        const personBalances: Record<string, { amount: number; name: string }> = {}
        const getKey = (m: any) => m.is_guest ? `guest_${m.guest_name?.toLowerCase()}` : m.user_id
        const getName = (m: any) => m.is_guest ? m.guest_name : (m.users?.name || m.users?.email || 'Unknown')
        const memberById: Record<string, any> = {}
        const memberByUserIdGroup: Record<string, any> = {}
        allMembersData?.forEach(m => { memberById[m.id] = m; if (m.user_id) memberByUserIdGroup[`${m.group_id}_${m.user_id}`] = m })

        expenses?.forEach((expense: any) => {
            const iPaid = expense.paid_by === currentUser.id
            const payerMember = expense.paid_by ? memberByUserIdGroup[`${expense.group_id}_${expense.paid_by}`] : memberById[expense.paid_by_guest]
            if (!payerMember) return
            const payerKey = getKey(payerMember)
            let guestIdx = 0
            const groupGuests = allMembersData?.filter(m => m.group_id === expense.group_id && m.is_guest) || []
            expense.expense_splits?.forEach((split: any) => {
                if (split.is_settled) return
                let debtorMember = split.guest_member_id ? memberById[split.guest_member_id] : split.user_id ? memberByUserIdGroup[`${expense.group_id}_${split.user_id}`] : groupGuests.length > 0 ? groupGuests[guestIdx++ % groupGuests.length] : null
                if (!debtorMember) return
                const debtorKey = getKey(debtorMember)
                const isMySplit = split.user_id === currentUser.id
                if (iPaid && !isMySplit) { owed += split.amount_owed; if (!personBalances[debtorKey]) personBalances[debtorKey] = { amount: 0, name: getName(debtorMember) }; personBalances[debtorKey].amount += split.amount_owed }
                else if (!iPaid && isMySplit) { owe += split.amount_owed; if (!personBalances[payerKey]) personBalances[payerKey] = { amount: 0, name: getName(payerMember) }; personBalances[payerKey].amount -= split.amount_owed }
            })
        })

        const pYouOwe: any[] = [], pOweYou: any[] = []
        Object.values(personBalances).forEach(p => { if (p.amount > 0.01) pOweYou.push(p); else if (p.amount < -0.01) pYouOwe.push({ ...p, amount: Math.abs(p.amount) }) })
        pYouOwe.sort((a, b) => b.amount - a.amount)
        pOweYou.sort((a, b) => b.amount - a.amount)
        setPeopleYouOwe(pYouOwe); setPeopleWhoOweYou(pOweYou)
        setBalances({ owed, owe })
        setLoading(false)
    }

    const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'
    const initial = name[0]?.toUpperCase() || '?'
    const netBalance = balances.owed - balances.owe
    const isNetPositive = netBalance > 0.01
    const isNetNegative = netBalance < -0.01

    return (
        <>
            <style>{`
                @keyframes floatUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes shimmer {
                    0%   { background-position: -200% center; }
                    100% { background-position: 200% center; }
                }
                .fade-up { animation: floatUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
                .fade-up-1 { animation: floatUp 0.5s 60ms  cubic-bezier(0.22,1,0.36,1) both; }
                .fade-up-2 { animation: floatUp 0.5s 120ms cubic-bezier(0.22,1,0.36,1) both; }
                .fade-up-3 { animation: floatUp 0.5s 180ms cubic-bezier(0.22,1,0.36,1) both; }
                .fade-up-4 { animation: floatUp 0.5s 240ms cubic-bezier(0.22,1,0.36,1) both; }
            `}</style>

            <div className="bg-gray-950 min-h-screen pb-32">
                {/* Hero header */}
                <div className="relative px-4 pt-8 pb-6 fade-up overflow-hidden">
                    {/* Subtle background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 via-transparent to-transparent pointer-events-none" />
                    <div className="relative flex items-start justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{getGreeting()} 👋</p>
                            <h1 className="text-3xl font-black text-white tracking-tight italic mt-0.5 capitalize">
                                Hey, {name}
                            </h1>
                        </div>
                        {/* Avatar + net balance chip */}
                        <div className="flex flex-col items-end gap-2">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 text-lg font-black">
                                {initial}
                            </div>
                            {!loading && (
                                <div className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider border ${isNetPositive ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : isNetNegative ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                                    {isNetPositive ? `+₹${netBalance.toFixed(0)}` : isNetNegative ? `-₹${Math.abs(netBalance).toFixed(0)}` : 'Settled'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Balance cards */}
                <div className="px-4 fade-up-1">
                    <div className="grid grid-cols-2 gap-3 mb-5">
                        <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-4 overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full -mr-8 -mt-8" />
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                                    <ArrowDownLeft size={13} className="text-emerald-400" />
                                </div>
                                <p className="text-gray-500 text-xs font-medium">You're owed</p>
                            </div>
                            <p className="text-emerald-400 text-2xl font-black">{loading ? '—' : `₹${balances.owed.toFixed(0)}`}</p>
                        </div>
                        <div className="relative bg-gray-900 border border-gray-800 rounded-2xl p-4 overflow-hidden">
                            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 rounded-full -mr-8 -mt-8" />
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-6 h-6 bg-red-500/15 rounded-lg flex items-center justify-center">
                                    <ArrowUpRight size={13} className="text-red-400" />
                                </div>
                                <p className="text-gray-500 text-xs font-medium">You owe</p>
                            </div>
                            <p className="text-red-400 text-2xl font-black">{loading ? '—' : `₹${balances.owe.toFixed(0)}`}</p>
                        </div>
                    </div>
                </div>

                {/* Quick actions */}
                <div className="px-4 mb-5 fade-up-2">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Quick Actions</p>
                    <div className="grid grid-cols-3 gap-3">
                        {[
                            { href: '/dashboard/groups/new', emoji: '👥', label: 'New Group', color: 'from-indigo-600/20 to-indigo-900/20', border: 'border-indigo-500/15' },
                            { href: '/dashboard/personal/add', emoji: '💸', label: 'Add Expense', color: 'from-emerald-600/20 to-emerald-900/20', border: 'border-emerald-500/15' },
                            { href: '/dashboard/trips/new', emoji: '✈️', label: 'Plan Trip', color: 'from-amber-600/20 to-amber-900/20', border: 'border-amber-500/15' },
                        ].map(action => {
                            const content = (
                                <div className={`bg-gradient-to-br ${action.color} border ${action.border} rounded-2xl p-4 flex flex-col items-center gap-2 hover:brightness-125 active:scale-95 transition-all duration-150 cursor-pointer w-full`}>
                                    <span className="text-2xl">{action.emoji}</span>
                                    <p className="text-xs text-gray-300 font-bold text-center leading-tight">{action.label}</p>
                                </div>
                            )

                            if (action.label === 'Add Expense') {
                                return (
                                    <button key={action.label} onClick={() => setIsAddSheetOpen(true)} className="w-full">
                                        {content}
                                    </button>
                                )
                            }

                            return (
                                <Link key={action.href} href={action.href!} className="w-full">
                                    {content}
                                </Link>
                            )
                        })}
                    </div>
                </div>

                {/* Upcoming Trips */}
                {upcomingTrips.length > 0 && (
                    <div className="px-4 mb-5 fade-up-3">
                        <div className="flex items-center justify-between mb-3">
                            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Upcoming Trips</p>
                            <Link href="/dashboard/trips" className="text-indigo-400 text-xs font-bold">See all →</Link>
                        </div>
                        <div className="space-y-3">
                            {upcomingTrips.map(trip => {
                                const start = new Date(trip.start_date)
                                const end = new Date(trip.end_date)
                                const daysUntil = Math.ceil((start.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                const totalBudget = trip.ai_budget_estimate?.total || (trip.ai_budget_estimate?.total_per_person * trip.members_count) || 0
                                return (
                                    <Link key={trip.id} href={`/dashboard/trips/${trip.id}`}>
                                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/5 transition-all relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/5 to-transparent" />
                                            <div className="relative flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-600/15 border border-indigo-500/20 rounded-2xl flex items-center justify-center shrink-0">
                                                    <span className="text-lg">✈️</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white font-bold text-sm truncate">{trip.destination}</p>
                                                    <p className="text-gray-500 text-xs flex items-center gap-1 mt-0.5">
                                                        <Calendar size={9} />
                                                        {start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – {end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end shrink-0 gap-1">
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${daysUntil <= 0 ? 'text-emerald-400' : daysUntil <= 7 ? 'text-amber-400' : 'text-gray-500'}`}>
                                                        {daysUntil <= 0 ? 'Today!' : daysUntil <= 7 ? `In ${daysUntil}d` : `${daysUntil}d`}
                                                    </span>
                                                    {totalBudget > 0 && <span className="text-xs text-emerald-400 font-bold">₹{totalBudget.toLocaleString('en-IN')}</span>}
                                                    <ChevronRight size={13} className="text-gray-600" />
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Balances by person */}
                {(peopleWhoOweYou.length > 0 || peopleYouOwe.length > 0) && (
                    <div className="px-4 mb-5 fade-up-3">
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Who Owes Who</p>
                        <div className="space-y-3">
                            {peopleWhoOweYou.map((p, i) => (
                                <div key={`owed-${i}`} className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-center shrink-0">
                                            <ArrowDownLeft size={14} className="text-emerald-400" />
                                        </div>
                                        <span className="text-gray-200 text-sm font-medium truncate">{p.name}</span>
                                    </div>
                                    <span className="text-emerald-400 font-black text-sm shrink-0">+₹{p.amount.toFixed(0)}</span>
                                </div>
                            ))}
                            {peopleYouOwe.map((p, i) => (
                                <div key={`owe-${i}`} className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 flex items-center justify-between">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center shrink-0">
                                            <ArrowUpRight size={14} className="text-red-400" />
                                        </div>
                                        <span className="text-gray-200 text-sm font-medium truncate">{p.name}</span>
                                    </div>
                                    <span className="text-red-400 font-black text-sm shrink-0">-₹{p.amount.toFixed(0)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Recent activity */}
                <div className="px-4 fade-up-4">
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Recent Activity</p>
                    {recentActivity.length === 0 && !loading ? (
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col items-center text-center">
                            <div className="text-4xl mb-3">🎯</div>
                            <p className="text-white font-bold">No activity yet</p>
                            <p className="text-gray-500 text-sm mt-1">Add a group expense to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {loading && [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />)}
                            {recentActivity.map((expense: any, idx: number) => {
                                const iconConfig = CATEGORY_ICONS[expense.category] || CATEGORY_ICONS['Other']
                                const Icon = iconConfig.icon
                                let payerName = 'Unknown'
                                if (expense.paid_by_guest) {
                                    const g = allMembers.find(m => m.id === expense.paid_by_guest)
                                    payerName = g?.guest_name || 'Guest'
                                } else if (expense.paid_by === user?.id) {
                                    payerName = 'you'
                                } else {
                                    const payer = allMembers.find(m => m.group_id === expense.group_id && m.user_id === expense.paid_by)
                                    payerName = payer?.users?.name || payer?.users?.email?.split('@')[0] || 'Member'
                                }
                                return (
                                    <div
                                        key={expense.id}
                                        className="bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-indigo-500/20 hover:bg-gray-800/50 transition cursor-pointer"
                                        onClick={() => router.push(`/dashboard/groups/${expense.group_id}`)}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 ${iconConfig.bg} rounded-xl flex items-center justify-center shrink-0`}>
                                                    <Icon size={18} className={iconConfig.color} />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm font-bold truncate">{expense.title}</p>
                                                    <p className="text-indigo-400 text-[11px] font-semibold mt-0.5 truncate">{expense.groups?.name}</p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end shrink-0">
                                                <p className="text-white text-sm font-black">₹{parseFloat(expense.amount).toFixed(0)}</p>
                                                <p className="text-gray-500 text-[10px] mt-0.5">by {payerName}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            <AddExpenseSheet
                isOpen={isAddSheetOpen}
                onClose={() => setIsAddSheetOpen(false)}
            />
        </>
    )
}