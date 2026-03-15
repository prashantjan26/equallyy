'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, Plus, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function GroupsPage() {
    const [groups, setGroups] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchGroups()
    }, [])

    async function fetchGroups() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('group_members')
            .select('group_id, groups(*)')
            .eq('user_id', user.id)

        if (data) {
            setGroups(data.map((d: any) => d.groups))
        }
        setLoading(false)
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="pt-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">Groups</h1>
                    <p className="text-gray-400 text-sm">Manage shared expenses</p>
                </div>
                <Link href="/dashboard/groups/new">
                    <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                        <Plus size={18} className="mr-1" /> New
                    </Button>
                </Link>
            </div>

            {/* Groups list */}
            {loading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-20 bg-gray-900 rounded-2xl animate-pulse" />
                    ))}
                </div>
            ) : groups.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800 p-8 flex flex-col items-center text-center">
                    <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center mb-4">
                        <Users size={28} className="text-indigo-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-1">No groups yet</h3>
                    <p className="text-gray-400 text-sm mb-4">Create a group for your next trip or hangout</p>
                    <Link href="/dashboard/groups/new">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                            Create your first group
                        </Button>
                    </Link>
                </Card>
            ) : (
                <div className="space-y-3">
                    {groups.map((group: any) => (
                        <Link key={group.id} href={`/dashboard/groups/${group.id}`}>
                            <Card className="bg-gray-900 border-gray-800 p-4 flex items-center justify-between hover:bg-gray-800 transition cursor-pointer">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                                        <Users size={20} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{group.name}</p>
                                        <p className="text-gray-400 text-xs capitalize">{group.type}</p>
                                    </div>
                                </div>
                                <ArrowRight size={18} className="text-gray-600" />
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    )
}