'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, MapPin, Calendar, Users, Wallet, CheckCircle2 } from 'lucide-react'

const BUDGET_TIERS = ['Budget', 'Mid-range', 'Luxury']

export default function EditTripPage() {
    const router = useRouter()
    const params = useParams()
    const tripId = params?.id as string
    const supabase = createClient()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const [destination, setDestination] = useState('')
    const [startingPoint, setStartingPoint] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [peopleCount, setPeopleCount] = useState('2')
    const [budgetTier, setBudgetTier] = useState('Mid-range')
    const [groups, setGroups] = useState<any[]>([])
    const [groupId, setGroupId] = useState<string>('')

    useEffect(() => {
        loadTripAndGroups()
    }, [tripId])

    async function loadTripAndGroups() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const [{ data: trip }, { data: userGroups }] = await Promise.all([
            supabase.from('trips').select('*').eq('id', tripId).single(),
            supabase.from('group_members').select('groups(id, name)').eq('user_id', user.id)
        ])

        if (trip) {
            setDestination(trip.destination || '')
            setStartDate(trip.start_date || '')
            setEndDate(trip.end_date || '')
            setPeopleCount(String(trip.members_count || 2))
            setBudgetTier(trip.budget_tier || 'Mid-range')
            setGroupId(trip.group_id || '')
        }

        if (userGroups) {
            const parsed = userGroups.map((g: any) => g.groups).filter(Boolean)
            setGroups(parsed)
        }

        setLoading(false)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!destination || !startDate || !endDate) return

        setSaving(true)
        setError(null)

        const { error: updateError } = await supabase
            .from('trips')
            .update({
                destination,
                start_date: startDate,
                end_date: endDate,
                members_count: parseInt(peopleCount),
                budget_tier: budgetTier,
                group_id: groupId || null,
            })
            .eq('id', tripId)

        if (updateError) {
            setError(updateError.message)
            setSaving(false)
            return
        }

        setSaved(true)
        setSaving(false)
        setTimeout(() => {
            router.push(`/dashboard/trips/${tripId}`)
        }, 800)
    }

    if (loading) {
        return (
            <div className="p-4 pt-10 space-y-4">
                {[1, 2, 3, 4].map(i => <div key={i} className="h-20 bg-gray-900 rounded-2xl animate-pulse" />)}
            </div>
        )
    }

    if (saved) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center">
                    <CheckCircle2 size={32} className="text-emerald-400" />
                </div>
                <p className="text-white font-bold text-lg">Trip updated!</p>
                <p className="text-gray-500 text-sm">Redirecting to trip details...</p>
            </div>
        )
    }

    return (
        <div className="p-4 space-y-5">
            {/* Header */}
            <div className="pt-6 flex items-center gap-3 mb-2">
                <Link href={`/dashboard/trips/${tripId}`}>
                    <button className="w-9 h-9 bg-gray-900 border border-gray-800 rounded-xl flex items-center justify-center">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-white">Edit Trip</h1>
                    <p className="text-gray-500 text-xs">Update trip details</p>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
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
                        placeholder="e.g. Bali, Rishikesh"
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
                    {/* Travelers */}
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

                    {/* Group */}
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
                                <option value="">Personal</option>
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
                                className={`p-2 rounded-xl text-xs font-bold transition-all ${budgetTier === tier
                                    ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/50'
                                    : 'bg-gray-800 text-gray-400 border border-transparent hover:bg-gray-700'
                                    }`}
                            >
                                {tier}
                            </button>
                        ))}
                    </div>
                </Card>

                <Button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl h-13 text-base font-bold mt-2"
                >
                    {saving ? 'Saving changes...' : 'Save Changes'}
                </Button>
            </form>
        </div>
    )
}
