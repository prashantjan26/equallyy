'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Users, Plane, Home, ShoppingBag, PartyPopper } from 'lucide-react'
import Link from 'next/link'

const GROUP_TYPES = [
    { value: 'trip', label: 'Trip', icon: Plane, color: 'text-amber-400', bg: 'bg-amber-600/20' },
    { value: 'home', label: 'Home', icon: Home, color: 'text-blue-400', bg: 'bg-blue-600/20' },
    { value: 'hangout', label: 'Hangout', icon: PartyPopper, color: 'text-pink-400', bg: 'bg-pink-600/20' },
    { value: 'shopping', label: 'Shopping', icon: ShoppingBag, color: 'text-green-400', bg: 'bg-green-600/20' },
    { value: 'general', label: 'General', icon: Users, color: 'text-indigo-400', bg: 'bg-indigo-600/20' },
]

export default function NewGroupPage() {
    const [name, setName] = useState('')
    const [type, setType] = useState('general')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const router = useRouter()
    const supabase = createClient()

    async function handleCreate() {
        if (!name.trim()) return setError('Please enter a group name')
        setLoading(true)
        setError('')

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Create group
        const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({ name: name.trim(), type, created_by: user.id })
            .select()
            .single()

        if (groupError) {
            setError(groupError.message)
            setLoading(false)
            return
        }

        // Add creator as member
        await supabase.from('group_members').insert({
            group_id: group.id,
            user_id: user.id,
            role: 'admin'
        })

        router.push(`/dashboard/groups/${group.id}`)
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="pt-6 flex items-center gap-3">
                <Link href="/dashboard/groups">
                    <button className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                </Link>
                <h1 className="text-xl font-bold text-white">New Group</h1>
            </div>

            {/* Group name */}
            <div className="space-y-2">
                <label className="text-gray-400 text-sm">Group name</label>
                <Input
                    placeholder="e.g. Goa Trip 2026"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="bg-gray-900 border-gray-700 text-white rounded-xl h-12 focus:border-indigo-500"
                />
            </div>

            {/* Group type */}
            <div className="space-y-3">
                <label className="text-gray-400 text-sm">Type</label>
                <div className="grid grid-cols-3 gap-3">
                    {GROUP_TYPES.map(({ value, label, icon: Icon, color, bg }) => (
                        <button
                            key={value}
                            onClick={() => setType(value)}
                            className={`p-3 rounded-xl border transition flex flex-col items-center gap-2 ${type === value
                                    ? 'border-indigo-500 bg-indigo-600/10'
                                    : 'border-gray-800 bg-gray-900'
                                }`}
                        >
                            <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
                                <Icon size={18} className={color} />
                            </div>
                            <span className="text-xs text-gray-300">{label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {/* Create button */}
            <Button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-xl h-12 text-base"
            >
                {loading ? 'Creating...' : 'Create Group'}
            </Button>
        </div>
    )
}