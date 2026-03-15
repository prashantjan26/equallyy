'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, Users, Wallet, Plane, Hotel, Utensils, Activity, Sparkles, CheckCircle2 } from 'lucide-react'

const BUDGET_TIERS = ['Budget', 'Mid-range', 'Luxury']

export default function NewTripPage() {
    const router = useRouter()
    const supabase = createClient()

    const [destination, setDestination] = useState('')
    const [startingPoint, setStartingPoint] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [peopleCount, setPeopleCount] = useState('2')
    const [budgetTier, setBudgetTier] = useState('Mid-range')
    const [groupId, setGroupId] = useState<string>('')
    const [groups, setGroups] = useState<any[]>([])
    
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [budget, setBudget] = useState<any>(null)

    useEffect(() => {
        fetchGroups()
    }, [])

    async function fetchGroups() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: userGroups } = await supabase
            .from('group_members')
            .select('groups(id, name)')
            .eq('user_id', user.id)

        if (userGroups) {
            const parsed = userGroups.map((g: any) => g.groups)
            setGroups(parsed)
            if (parsed.length > 0) {
                setGroupId(parsed[0].id)
            }
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!destination || !startDate || !endDate || !peopleCount || !budgetTier) return

        setLoading(true)
        setError(null)
        setBudget(null)

        try {
            // 1. Generate AI Budget
            const res = await fetch('/api/trip-budget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    destination, 
                    startingPoint,
                    startDate, 
                    endDate, 
                    peopleCount: parseInt(peopleCount), 
                    budgetTier 
                })
            })

            if (!res.ok) throw new Error('Failed to generate budget')
            
            const aiBudget = await res.json()
            
            // 2. Save to Supabase trips table
            const { data: { user } } = await supabase.auth.getUser()
            
            if (user) {
                const { error: dbError } = await supabase.from('trips').insert({
                    user_id: user.id,
                    group_id: groupId || null,
                    destination,
                    start_date: startDate,
                    end_date: endDate,
                    members_count: parseInt(peopleCount),
                    ai_budget_estimate: aiBudget,
                    budget_tier: budgetTier
                })

                if (dbError) {
                    console.error("Supabase insert error:", dbError)
                    throw new Error('Failed to save trip to database')
                }
            }

            setBudget(aiBudget)
        } catch (err: any) {
            setError(err.message || 'An error occurred while planning the trip')
        } finally {
            setLoading(false)
        }
    }

    if (budget) {
        return (
        <div className="p-4 space-y-6 pb-32">
                <div className="pt-6 flex items-center justify-between mb-2">
                    <h1 className="text-xl font-bold text-white flex items-center gap-2">
                        <Sparkles className="text-indigo-400" size={20} />
                        Your AI Trip Plan
                    </h1>
                </div>

                <Card className="bg-gray-900 border-indigo-500/30 p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                    
                    <div className="relative z-10 flex flex-col items-center justify-center text-center mb-6">
                        <h2 className="text-2xl font-bold text-white mb-1">{destination}</h2>
                        <p className="text-gray-400 text-sm mb-4">Total Estimated Budget</p>
                        <div className="text-4xl font-bold text-indigo-400">
                            ₹{budget.total.toLocaleString('en-IN')}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">₹{budget.per_person_total.toLocaleString('en-IN')} per person</p>
                    </div>

                    <div className="space-y-4 relative z-10">
                        {[
                            { key: 'transport', icon: Plane, color: 'text-blue-400', label: 'Transport' },
                            { key: 'accommodation', icon: Hotel, color: 'text-purple-400', label: 'Accommodation' },
                            { key: 'food', icon: Utensils, color: 'text-orange-400', label: 'Food' },
                            { key: 'activities', icon: Activity, color: 'text-green-400', label: 'Activities' },
                            { key: 'local_transport', icon: MapPin, color: 'text-yellow-400', label: 'Local Transport' }
                        ].map((cat: any) => {
                            const Icon = cat.icon
                            const categoryData = (budget as any)[cat.key] || { amount: 0, description: '', per_person: 0 }
                            return (
                                <div key={cat.key} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/30">
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="flex items-center gap-2 font-medium text-white">
                                            <Icon size={16} className={cat.color} />
                                            {cat.label}
                                        </div>
                                        <span className="text-white font-bold">₹{categoryData.amount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[11px] text-gray-500 italic max-w-[70%]">{categoryData.description}</p>
                                        <p className="text-[10px] text-gray-400">₹{categoryData.per_person.toLocaleString('en-IN')} pp</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {budget.trip_summary && (
                        <div className="mt-6 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed italic">
                            {budget.trip_summary}
                        </div>
                    )}

                    {budget.money_saving_tip && (
                        <div className="mt-4 p-4 bg-green-500/10 rounded-2xl border border-green-500/20 flex gap-3">
                            <Sparkles size={18} className="text-green-400 shrink-0" />
                            <div>
                                <p className="text-[10px] text-green-500 font-bold uppercase tracking-wider mb-1">Money Saving Tip</p>
                                <p className="text-xs text-green-200">{budget.money_saving_tip}</p>
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex items-center justify-center gap-2 text-green-400 text-sm font-medium">
                        <CheckCircle2 size={16} /> Trip saved successfully
                    </div>
                </Card>

                <Button 
                    onClick={() => router.push('/dashboard/trips')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 text-base font-medium"
                >
                    Back to Trips
                </Button>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-6 pb-32">
            <div className="pt-6 flex items-center gap-3 mb-2">
                <Link href="/dashboard/trips">
                    <button className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                </Link>
                <h1 className="text-xl font-bold text-white">Plan a Trip</h1>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Starting Point */}
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <label className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
                        <MapPin size={14} /> Starting Point
                    </label>
                    <input
                        type="text"
                        value={startingPoint}
                        onChange={e => setStartingPoint(e.target.value)}
                        placeholder="e.g. Delhi, Mumbai"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                        required
                    />
                </Card>

                {/* Destination */}
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <label className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
                        <MapPin size={14} /> Destination
                    </label>
                    <input
                        type="text"
                        value={destination}
                        onChange={e => setDestination(e.target.value)}
                        placeholder="e.g. Bali, Phuket, Rishikesh"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                        required
                    />
                </Card>

                {/* Dates */}
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <label className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
                        <Calendar size={14} /> Travel Dates
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wider">Start</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 [color-scheme:dark]"
                                required
                            />
                        </div>
                        <div>
                            <span className="text-[10px] text-gray-500 mb-1 block uppercase tracking-wider">End</span>
                            <input
                                type="date"
                                value={endDate}
                                min={startDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 [color-scheme:dark]"
                                required
                            />
                        </div>
                    </div>
                </Card>

                <div className="grid grid-cols-2 gap-3">
                    {/* People */}
                    <Card className="bg-gray-900 border-gray-800 p-4">
                        <label className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
                            <Users size={14} /> Travelers
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={peopleCount}
                            onChange={e => setPeopleCount(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                            required
                        />
                    </Card>

                    {/* Group Selection */}
                    {groups.length > 0 && (
                        <Card className="bg-gray-900 border-gray-800 p-4">
                            <label className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
                                <Users size={14} /> Group
                            </label>
                            <select
                                value={groupId}
                                onChange={e => setGroupId(e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                            >
                                <option value="">Personal (No group)</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>{g.name}</option>
                                ))}
                            </select>
                        </Card>
                    )}
                </div>

                {/* Budget Tier */}
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <label className="flex items-center gap-2 text-gray-400 text-xs font-medium mb-3">
                        <Wallet size={14} /> Budget Tier
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        {BUDGET_TIERS.map(tier => (
                            <button
                                key={tier}
                                type="button"
                                onClick={() => setBudgetTier(tier)}
                                className={`p-2 rounded-lg text-xs font-medium transition-all ${
                                    budgetTier === tier 
                                        ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50' 
                                        : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700'
                                }`}
                            >
                                {tier}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Submit */}
                <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 text-base font-medium mt-4 group"
                >
                    {loading ? (
                        <span className="flex items-center gap-2">
                            <Sparkles className="animate-pulse" size={18} /> Generating AI Plan...
                        </span>
                    ) : (
                        <span className="flex items-center gap-2">
                            <Sparkles className="group-hover:text-yellow-300 transition-colors" size={18} /> 
                            Generate AI Budget
                        </span>
                    )}
                </Button>
            </form>
        </div>
    )
}
