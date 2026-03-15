'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Wallet, TrendingUp, Plus } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
    const [user, setUser] = useState<any>(null)
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            setUser(user)
        })
    }, [])

    const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'there'

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="pt-6">
                <p className="text-gray-400 text-sm">Good morning 👋</p>
                <h1 className="text-2xl font-bold text-white capitalize">Hey, {name}</h1>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <p className="text-gray-400 text-xs mb-1">You are owed</p>
                    <p className="text-green-400 text-2xl font-bold">₹0</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <p className="text-gray-400 text-xs mb-1">You owe</p>
                    <p className="text-red-400 text-2xl font-bold">₹0</p>
                </Card>
            </div>

            {/* Quick actions */}
            <div>
                <h2 className="text-gray-400 text-sm font-medium mb-3">Quick actions</h2>
                <div className="grid grid-cols-3 gap-3">
                    <Link href="/dashboard/groups/new">
                        <Card className="bg-gray-900 border-gray-800 p-4 flex flex-col items-center gap-2 hover:bg-gray-800 transition cursor-pointer">
                            <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                                <Users size={20} className="text-indigo-400" />
                            </div>
                            <p className="text-xs text-gray-300 text-center">New Group</p>
                        </Card>
                    </Link>
                    <Link href="/dashboard/personal/add">
                        <Card className="bg-gray-900 border-gray-800 p-4 flex flex-col items-center gap-2 hover:bg-gray-800 transition cursor-pointer">
                            <div className="w-10 h-10 bg-emerald-600/20 rounded-xl flex items-center justify-center">
                                <Wallet size={20} className="text-emerald-400" />
                            </div>
                            <p className="text-xs text-gray-300 text-center">Add Expense</p>
                        </Card>
                    </Link>
                    <Link href="/dashboard/trips/new">
                        <Card className="bg-gray-900 border-gray-800 p-4 flex flex-col items-center gap-2 hover:bg-gray-800 transition cursor-pointer">
                            <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
                                <TrendingUp size={20} className="text-amber-400" />
                            </div>
                            <p className="text-xs text-gray-300 text-center">Plan Trip</p>
                        </Card>
                    </Link>
                </div>
            </div>

            {/* Recent activity */}
            <div>
                <h2 className="text-gray-400 text-sm font-medium mb-3">Recent activity</h2>
                <Card className="bg-gray-900 border-gray-800 p-6 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-3">
                        <Plus size={24} className="text-gray-500" />
                    </div>
                    <p className="text-gray-400 text-sm">No activity yet</p>
                    <p className="text-gray-600 text-xs mt-1">Create a group or add an expense to get started</p>
                </Card>
            </div>
        </div>
    )
}