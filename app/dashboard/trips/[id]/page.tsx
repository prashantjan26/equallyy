'use client'

import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, Users, Wallet, Plane, Hotel, Utensils, Activity, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const supabase = createClient()
    
    const [trip, setTrip] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        fetchTrip()
    }, [id])

    async function fetchTrip() {
        try {
            const { data, error } = await supabase
                .from('trips')
                .select('*, groups(name)')
                .eq('id', id)
                .single()

            if (error) throw error
            setTrip(data)
        } catch (err: any) {
            console.error('Error fetching trip:', err)
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="p-4 pt-10 space-y-4">
                <div className="h-10 w-24 bg-gray-900 rounded-xl animate-pulse" />
                <div className="h-48 bg-gray-900 rounded-2xl animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />)}
                </div>
            </div>
        )
    }

    if (error || !trip) {
        return (
            <div className="p-4 pt-10 text-center">
                <p className="text-red-400 mb-4">Trip not found or error loading data.</p>
                <Link href="/dashboard/trips">
                    <Button variant="outline" className="border-gray-800 text-gray-400">Back to Trips</Button>
                </Link>
            </div>
        )
    }

    const budget = trip.ai_budget_estimate
    const membersCount = trip.members_count || 1

    // Helper to extract category data with fallbacks for legacy data
    const getCat = (key: string) => {
        const val = budget[key]
        if (val && typeof val === 'object' && 'amount' in val) return val
        
        // Fallback for legacy data format
        let amount = 0
        if (key === 'transport') amount = budget.transport || budget.flights || 0
        else amount = budget[key] || 0
        
        return {
            amount: amount,
            description: 'Estimated cost per person: ₹' + (amount/membersCount).toLocaleString('en-IN'),
            per_person: amount / membersCount
        }
    }

    const categories = [
        { key: 'transport', icon: Plane, color: 'text-blue-400', label: 'Transport' },
        { key: 'accommodation', icon: Hotel, color: 'text-purple-400', label: 'Accommodation' },
        { key: 'food', icon: Utensils, color: 'text-orange-400', label: 'Food' },
        { key: 'activities', icon: Activity, color: 'text-green-400', label: 'Activities' },
        { key: 'local_transport', icon: MapPin, color: 'text-yellow-400', label: 'Local Transport' }
    ]

    return (
        <div className="p-4 space-y-6 pb-32 text-white">
            {/* Header */}
            <div className="pt-6 flex items-center gap-3 mb-2">
                <Link href="/dashboard/trips">
                    <button className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                </Link>
                <h1 className="text-xl font-bold">Trip Details</h1>
            </div>

            <Card className="bg-gray-900 border-indigo-500/30 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                
                <div className="relative z-10 flex flex-col items-center justify-center text-center mb-8">
                    <div className="w-12 h-12 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4 text-indigo-400 border border-indigo-500/20">
                        <Sparkles size={24} />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">{trip.destination}</h2>
                    <p className="text-indigo-400 text-sm font-medium mb-4 flex items-center gap-1.5 justify-center">
                        <Users size={14} /> {trip.groups?.name || 'Personal Trip'}
                    </p>
                    
                    <div className="bg-gray-800/50 rounded-2xl px-6 py-4 border border-gray-700/30">
                        <p className="text-gray-400 text-[10px] mb-1 uppercase tracking-widest font-bold">Total Estimated Budget</p>
                        <div className="text-3xl font-bold text-white">
                            ₹{(budget.total || budget.total_per_person * membersCount).toLocaleString('en-IN')}
                        </div>
                        <p className="text-gray-500 text-[10px] mt-1 italic">₹{(budget.per_person_total || budget.total_per_person).toLocaleString('en-IN')} per person</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-8 relative z-10">
                    <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/20 flex flex-col items-center text-center">
                        <Calendar size={16} className="text-gray-500 mb-1" />
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Dates</span>
                        <span className="text-white text-xs font-medium">
                            {new Date(trip.start_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - {new Date(trip.end_date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                    </div>
                    <div className="bg-gray-800/30 p-3 rounded-xl border border-gray-700/20 flex flex-col items-center text-center">
                        <Wallet size={16} className="text-gray-500 mb-1" />
                        <span className="text-[10px] text-gray-500 uppercase font-bold">Tier</span>
                        <span className="text-white text-xs font-medium uppercase tracking-wider">{trip.budget_tier}</span>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 pl-1">Full Budget Breakdown</h3>
                    
                    {categories.map((cat) => {
                        const Icon = cat.icon
                        const data = getCat(cat.key)
                        return (
                            <div key={cat.key} className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700/30">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2 font-medium text-white">
                                        <Icon size={16} className={cat.color} />
                                        {cat.label}
                                    </div>
                                    <span className="text-white font-bold">₹{data.amount.toLocaleString('en-IN')}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <p className="text-[11px] text-gray-400 italic max-w-[70%]">{data.description}</p>
                                    <p className="text-[10px] text-gray-500 font-medium">₹{data.per_person.toLocaleString('en-IN')} pp</p>
                                </div>
                            </div>
                        )
                    })}

                    {budget.trip_summary && (
                        <div className="mt-4 p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-xs text-indigo-300 leading-relaxed italic">
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
                </div>
            </Card>

            <div className="flex gap-3">
                <Button 
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-14 font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-[0.98]"
                    onClick={() => {
                        if (trip.group_id) {
                            router.push(`/dashboard/groups/${trip.group_id}`)
                        } else {
                            router.push('/dashboard/trips')
                        }
                    }}
                >
                    {trip.group_id ? 'View Group Workspace' : 'Back to All Trips'}
                </Button>
            </div>
        </div>
    )
}
