'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Users, Receipt, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function GroupDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [group, setGroup] = useState<any>(null)
    const [expenses, setExpenses] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [balances, setBalances] = useState<any>({ owed: 0, owe: 0 })
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        fetchGroupData()
    }, [id])

    async function fetchGroupData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Fetch group
        const { data: groupData } = await supabase
            .from('groups')
            .select('*')
            .eq('id', id)
            .single()
        setGroup(groupData)

        // Fetch members
        const { data: membersData } = await supabase
            .from('group_members')
            .select('*, users(name, email)')
            .eq('group_id', id)
        setMembers(membersData || [])

        // Fetch expenses
        const { data: expensesData } = await supabase
            .from('expenses')
            .select('*, expense_splits(*)')
            .eq('group_id', id)
            .order('created_at', { ascending: false })
        setExpenses(expensesData || [])

        // Calculate balances
        let owed = 0, owe = 0
        expensesData?.forEach((expense: any) => {
            expense.expense_splits?.forEach((split: any) => {
                if (split.user_id === user.id && !split.is_settled) {
                    if (expense.paid_by === user.id) owed += split.amount_owed
                    else owe += split.amount_owed
                }
            })
        })
        setBalances({ owed, owe })
        setLoading(false)
    }

    if (loading) return (
        <div className="p-4 pt-10 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />)}
        </div>
    )

    if (!group) return (
        <div className="p-4 pt-10 text-center text-gray-400">Group not found</div>
    )

    return (
        <div className="p-4 space-y-5">
            {/* Header */}
            <div className="pt-6 flex items-center gap-3">
                <Link href="/dashboard/groups">
                    <button className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                </Link>
                <div className="flex-1">
                    <h1 className="text-xl font-bold text-white">{group.name}</h1>
                    <p className="text-gray-400 text-xs capitalize">{group.type} · {members.length} members</p>
                </div>
                <Link href={`/dashboard/groups/${id}/add-expense`}>
                    <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-9">
                        <Plus size={16} className="mr-1" /> Add
                    </Button>
                </Link>
            </div>

            {/* Balance cards */}
            <div className="grid grid-cols-2 gap-3">
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <p className="text-gray-400 text-xs mb-1">You are owed</p>
                    <p className="text-green-400 text-xl font-bold">₹{balances.owed.toFixed(0)}</p>
                </Card>
                <Card className="bg-gray-900 border-gray-800 p-4">
                    <p className="text-gray-400 text-xs mb-1">You owe</p>
                    <p className="text-red-400 text-xl font-bold">₹{balances.owe.toFixed(0)}</p>
                </Card>
            </div>

            {/* Members */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-gray-400 text-sm font-medium">Members</h2>
                    <Link href={`/dashboard/groups/${id}/invite`}>
                        <button className="text-indigo-400 text-xs flex items-center gap-1">
                            <Plus size={12} /> Invite
                        </button>
                    </Link>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {members.map((member: any) => (
                        <div key={member.id} className="flex items-center gap-2 bg-gray-900 rounded-xl px-3 py-2">
                            <div className="w-6 h-6 bg-indigo-600/30 rounded-full flex items-center justify-center">
                                <span className="text-indigo-300 text-xs font-medium">
                                    {member.users?.name?.[0]?.toUpperCase() || '?'}
                                </span>
                            </div>
                            <span className="text-gray-300 text-xs">{member.users?.name || member.users?.email}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Expenses */}
            <div>
                <h2 className="text-gray-400 text-sm font-medium mb-3">Expenses</h2>
                {expenses.length === 0 ? (
                    <Card className="bg-gray-900 border-gray-800 p-6 text-center">
                        <Receipt size={28} className="text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No expenses yet</p>
                        <p className="text-gray-600 text-xs mt-1">Add the first expense for this group</p>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {expenses.map((expense: any) => (
                            <Card key={expense.id} className="bg-gray-900 border-gray-800 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600/20 rounded-xl flex items-center justify-center">
                                        <Receipt size={18} className="text-indigo-400" />
                                    </div>
                                    <div>
                                        <p className="text-white text-sm font-medium">{expense.title}</p>
                                        <p className="text-gray-400 text-xs">{expense.category}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-white font-semibold">₹{expense.amount}</p>
                                    <p className="text-gray-500 text-xs">
                                        {expense.expense_splits?.length} splits
                                    </p>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}