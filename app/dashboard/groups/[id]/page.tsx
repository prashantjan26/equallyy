'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Plus, Users, Receipt, Search, MessageSquare, Send, Bell, CheckCircle, User, Trash2, Pencil, ChevronDown, Utensils, Car, Building2, Map, ShoppingBag, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'

const CATEGORY_ICONS: Record<string, { icon: any; color: string; bg: string }> = {
    Food:       { icon: Utensils,     color: 'text-orange-400', bg: 'bg-orange-500/20' },
    Transport:  { icon: Car,          color: 'text-blue-400',   bg: 'bg-blue-500/20'   },
    Hotel:      { icon: Building2,    color: 'text-purple-400', bg: 'bg-purple-500/20' },
    Activities: { icon: Map,          color: 'text-green-400',  bg: 'bg-green-500/20'  },
    Shopping:   { icon: ShoppingBag,  color: 'text-pink-400',   bg: 'bg-pink-500/20'   },
    Other:      { icon: MoreHorizontal, color: 'text-gray-400', bg: 'bg-gray-500/20'   },
}

export default function GroupDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    
    // Group Data
    const [group, setGroup] = useState<any>(null)
    const [expenses, setExpenses] = useState<any[]>([])
    const [members, setMembers] = useState<any[]>([])
    const [balances, setBalances] = useState<any>({ owed: 0, owe: 0 })
    const [debtBreakdown, setDebtBreakdown] = useState<any[]>([])
    const [debtExpanded, setDebtExpanded] = useState(false)
    const [debtTab, setDebtTab] = useState<'mine' | 'group'>('mine')
    const [settlementMode, setSettlementMode] = useState<'direct' | 'simplified'>('direct')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    
    // Tabs state
    const [activeTab, setActiveTab] = useState<'expenses' | 'chat'>('expenses')
    
    // Search state
    const [searchQuery, setSearchQuery] = useState('')
    
    // Chat state
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    
    const supabase = createClient()

    useEffect(() => {
        fetchGroupData()
    }, [id, settlementMode])

    // Subscription for chat
    useEffect(() => {
        if (!id) return

        const channel = supabase
            .channel(`group-messages-${id}`)
            .on('postgres_changes', { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'group_messages',
                filter: `group_id=eq.${id}`
            }, async (payload) => {
                // Fetch the sender details to append to the message instantly
                const { data: userData } = await supabase
                    .from('users')
                    .select('name, email')
                    .eq('id', payload.new.user_id)
                    .single()
                
                const completeMessage = {
                    ...payload.new,
                    users: userData
                }
                
                setMessages(prev => [...prev, completeMessage])
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [id])

    // Auto-scroll on new message
    useEffect(() => {
        if (activeTab === 'chat' && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, activeTab])


    const getMemberKey = (m: any) => m?.user_id || (m?.id ? `guest_${m.id}` : null)
    const getMemberName = (m: any, isFrom: boolean, actingUser: any) => {
        if (!m) return 'Unknown'
        if (actingUser && m.user_id === actingUser.id) return isFrom ? 'You' : 'you'
        return m.is_guest ? m.guest_name : (m.users?.name || m.users?.email || 'Unknown')
    }

    const calculateDirectSettlement = (expenses: any[], members: any[], user: any) => {
        const debtMap: Record<string, Record<string, number>> = {}
        const myKey = getMemberKey({ user_id: user.id })

        expenses?.forEach((expense: any) => {
            const payerMember = expense.paid_by
                ? members?.find((m: any) => m.user_id === expense.paid_by)
                : expense.paid_by_guest
                    ? members?.find((m: any) => m.id === expense.paid_by_guest)
                    : null

            if (!payerMember) return
            const payerKey = getMemberKey(payerMember)

            let guestIdx = 0
            const guestMembers = members?.filter((m: any) => m.is_guest) || []

            expense.expense_splits?.forEach((split: any) => {
                if (split.is_settled) return
                let debtorMember = split.guest_member_id 
                    ? members?.find((m: any) => m.id === split.guest_member_id)
                    : split.user_id 
                        ? members?.find((m: any) => m.user_id === split.user_id)
                        : guestMembers.length > 0 ? guestMembers[guestIdx++ % guestMembers.length] : null

                if (!debtorMember) return
                const debtorKey = getMemberKey(debtorMember)
                if (debtorKey === payerKey) return

                if (!debtMap[debtorKey]) debtMap[debtorKey] = {}
                debtMap[debtorKey][payerKey] = (debtMap[debtorKey][payerKey] || 0) + split.amount_owed
            })
        })

        const debts: any[] = []
        Object.keys(debtMap).forEach(fromKey => {
            Object.keys(debtMap[fromKey]).forEach(toKey => {
                const amount = debtMap[fromKey][toKey]
                if (amount > 0.01) {
                    const fromM = members?.find(m => getMemberKey(m) === fromKey)
                    const toM = members?.find(m => getMemberKey(m) === toKey)
                    debts.push({
                        fromId: fromKey, toId: toKey, amount,
                        fromName: getMemberName(fromM, true, user), toName: getMemberName(toM, false, user),
                        isMe: fromKey === myKey || toKey === myKey
                    })
                }
            })
        })
        return debts
    }

    const calculateSimplifiedSettlement = (expenses: any[], members: any[], user: any) => {
        const balances: Record<string, number> = {}
        const myKey = getMemberKey({ user_id: user.id })
        
        // 1. Calculate net balance for each member: total paid - total share
        members.forEach(m => balances[getMemberKey(m) || ''] = 0)
        
        expenses.forEach(expense => {
            const payerMember = expense.paid_by
                ? members.find(m => m.user_id === expense.paid_by)
                : members.find(m => m.id === expense.paid_by_guest)
            
            if (!payerMember) return
            const payerKey = getMemberKey(payerMember) || ''
            
            let guestIdx = 0
            const guestMembers = members.filter(m => m.is_guest)
            
            expense.expense_splits?.forEach((split: any) => {
                if (split.is_settled) return
                const debtorKey = getMemberKey(
                    split.guest_member_id ? members.find(m => m.id === split.guest_member_id) :
                    split.user_id ? members.find(m => m.user_id === split.user_id) :
                    guestMembers[guestIdx++ % guestMembers.length]
                ) || ''
                
                if (debtorKey === payerKey) return
                
                balances[payerKey] += split.amount_owed
                balances[debtorKey] -= split.amount_owed
            })
        })

        // 2. Greedy matching
        const creditors = Object.entries(balances)
            .filter(([, b]) => b > 0.01)
            .sort((a, b) => b[1] - a[1])
        const debtors = Object.entries(balances)
            .filter(([, b]) => b < -0.01)
            .sort((a, b) => a[1] - b[1]) // Most negative first

        const debts: any[] = []
        let i = 0, j = 0
        while (i < debtors.length && j < creditors.length) {
            const [dKey, dBal] = debtors[i]
            const [cKey, cBal] = creditors[j]
            const amount = Math.min(Math.abs(dBal), cBal)
            
            const fromM = members.find(m => getMemberKey(m) === dKey)
            const toM = members.find(m => getMemberKey(m) === cKey)
            
            debts.push({
                fromId: dKey, toId: cKey, amount,
                fromName: getMemberName(fromM, true, user), toName: getMemberName(toM, false, user),
                isMe: dKey === myKey || cKey === myKey
            })

            debtors[i][1] += amount
            creditors[j][1] -= amount
            if (Math.abs(debtors[i][1]) < 0.01) i++
            if (Math.abs(creditors[j][1]) < 0.01) j++
        }
        return debts
    }

    async function fetchGroupData() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return
        setCurrentUser(user)

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
        // "You are owed" = sum of OTHER people's unsettled splits on expenses YOU paid
        // "You owe" = sum of YOUR unsettled splits on expenses OTHERS paid
        let owed = 0, owe = 0
        expensesData?.forEach((expense: any) => {
            const iPaid = (expense.paid_by === user.id)
            expense.expense_splits?.forEach((split: any) => {
                if (split.is_settled) return
                
                // Determine if this split is mine
                const isMySplit = split.user_id === user.id
                
                if (iPaid && !isMySplit) {
                    // Others owe me for this expense
                    owed += split.amount_owed
                } else if (!iPaid && isMySplit) {
                    // I owe the payer for this expense
                    owe += split.amount_owed
                }
            })
        })
        setBalances({ owed, owe })

        // Compute per-person debt breakdown — works for guests too
        const debts = settlementMode === 'direct' 
            ? calculateDirectSettlement(expensesData || [], membersData || [], user)
            : calculateSimplifiedSettlement(expensesData || [], membersData || [], user)
            
        setDebtBreakdown(debts)


        // Fetch chat history
        const { data: msgsData } = await supabase
            .from('group_messages')
            .select('*, users(name, email)')
            .eq('group_id', id)
            .order('created_at', { ascending: true })
        setMessages(msgsData || [])

        setLoading(false)
    }

    async function removeGuest(guestId: string) {
        if (!confirm('Are you sure you want to remove this guest from the group?')) return
        
        const { error } = await supabase.from('group_members').delete().eq('id', guestId)
        if (error) {
            alert(`Failed to remove guest: ${error.message}. You may need to add a DELETE policy on the group_members table in Supabase.`)
            return
        }
        setMembers(prev => prev.filter(m => m.id !== guestId))
    }

    async function deleteExpense(expenseId: string) {
        if (!confirm('Are you sure you want to delete this expense? All splits will also be removed.')) return

        // First delete the splits (in case cascade isn't set up)
        await supabase.from('expense_splits').delete().eq('expense_id', expenseId)
        
        const { error } = await supabase.from('expenses').delete().eq('id', expenseId)
        if (error) {
            alert(`Failed to delete expense: ${error.message}`)
            return
        }

        const updatedExpenses = expenses.filter(e => e.id !== expenseId)
        setExpenses(updatedExpenses)

        // Recalculate balances with the remaining expenses
        if (currentUser) {
            let owed = 0, owe = 0
            updatedExpenses.forEach((expense: any) => {
                const iPaid = expense.paid_by === currentUser.id
                expense.expense_splits?.forEach((split: any) => {
                    if (split.is_settled) return
                    if (iPaid && split.user_id !== currentUser.id) {
                        owed += split.amount_owed
                    } else if (!iPaid && split.user_id === currentUser.id) {
                        owe += split.amount_owed
                    }
                })
            })
            setBalances({ owed, owe })
        }
    }

    async function sendMessage(type: 'message' | 'expense_request' = 'message', contentOverride?: string) {
        let contentToSend = contentOverride || newMessage.trim()
        if (!contentToSend || !currentUser) return

        setSending(true)
        if (type === 'message') setNewMessage('')

        await supabase.from('group_messages').insert({
            group_id: id,
            user_id: currentUser.id,
            content: contentToSend,
            type: type,
            is_resolved: false
        })

        setSending(false)
    }

    async function resolveExpenseRequest(messageId: string) {
        await supabase
            .from('group_messages')
            .update({ is_resolved: true })
            .eq('id', messageId)

        // Optimistically update local state since update events might not bring relationships back down identically
        setMessages(prev => prev.map(m => 
            m.id === messageId ? { ...m, is_resolved: true } : m
        ))
    }

    if (loading) return (
        <div className="p-4 pt-10 space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-900 rounded-2xl animate-pulse" />)}
        </div>
    )

    if (!group) return (
        <div className="p-4 pt-10 text-center text-gray-400">Group not found</div>
    )

    const filteredExpenses = expenses.filter(expense => 
        expense.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.amount.toString().includes(searchQuery)
    )

    return (
        <div className={`flex flex-col h-screen ${activeTab === 'chat' ? 'overflow-hidden' : ''}`}>
            <div className="p-4 space-y-5 flex-shrink-0 relative z-10 bg-black pb-0">
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
                    {activeTab === 'expenses' && (
                        <Link href={`/dashboard/groups/${id}/add-expense`}>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-xl h-9">
                                <Plus size={16} className="mr-1" /> Add
                            </Button>
                        </Link>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-gray-900 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('expenses')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'expenses' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <Receipt size={16} /> Expenses
                    </button>
                    <button 
                        onClick={() => setActiveTab('chat')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <MessageSquare size={16} /> Chat
                    </button>
                </div>
            </div>

            {/* Content Area */}
            {activeTab === 'expenses' ? (
                <div className="p-4 space-y-5 overflow-y-auto pb-24">
                    {/* Balance cards */}
                    <div className="grid grid-cols-2 gap-3 relative">
                        <Card className="bg-gray-900 border-gray-800 p-4">
                            <p className="text-gray-400 text-xs mb-1">You are owed</p>
                            <p className="text-green-400 text-xl font-bold">₹{balances.owed.toFixed(2)}</p>
                        </Card>
                        <Card className="bg-gray-900 border-gray-800 p-4">
                            <p className="text-gray-400 text-xs mb-1">You owe</p>
                            <p className="text-red-400 text-xl font-bold">₹{balances.owe.toFixed(2)}</p>
                        </Card>
                    </div>
                    
                    <Button 
                        onClick={() => alert('Debt settlement transfer UI coming soon!')}
                        variant="outline" 
                        className="w-full bg-gray-900 border-gray-800 hover:bg-gray-800 text-gray-300"
                    >
                        Settle Balances
                    </Button>

                    {/* Who owes who — expandable */}
                    {debtBreakdown.length > 0 && (() => {
                        const myDebts = debtBreakdown.filter(d => d.isMe)
                        // Build per-member net summary for ALL members
                        const memberNetMap: Record<string, { name: string, netAmount: number }> = {}
                        
                        // Pre-populate with all members so they all appear (including settled ones)
                        members.forEach(m => {
                            const key = getMemberKey(m)
                            if (key) {
                                memberNetMap[key] = {
                                    name: getMemberName(m, true, currentUser),
                                    netAmount: 0
                                }
                            }
                        })

                        debtBreakdown.forEach(debt => {
                            if (memberNetMap[debt.fromId]) memberNetMap[debt.fromId].netAmount -= debt.amount
                            if (memberNetMap[debt.toId]) memberNetMap[debt.toId].netAmount += debt.amount
                        })

                        const memberSummary = Object.entries(memberNetMap)
                            .sort((a, b) => b[1].netAmount - a[1].netAmount)

                        return (
                            <Card className="bg-gray-900 border-gray-800 overflow-hidden">
                                {/* Header toggle */}
                                <button
                                    onClick={() => setDebtExpanded(prev => !prev)}
                                    className="w-full flex items-center justify-between px-4 py-3"
                                >
                                    <span className="text-gray-300 text-sm font-medium">
                                        Balances breakdown
                                    </span>
                                    <ChevronDown
                                        size={16}
                                        className={`text-gray-400 transition-transform duration-200 ${debtExpanded ? 'rotate-180' : ''}`}
                                    />
                                </button>

                                {debtExpanded && (
                                    <div className="border-t border-gray-800">
                                        {/* Inner sub-tabs */}
                                        <div className="mx-4 mt-4 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="space-y-0.5">
                                                    <p className="text-white text-xs font-medium">Settlement Mode</p>
                                                    <p className="text-gray-500 text-[10px]">
                                                        {settlementMode === 'direct' 
                                                            ? 'Raw debts per expense (no redistribution).' 
                                                            : 'Clean view: minimizes total payments needed.'}
                                                    </p>
                                                </div>
                                                <div className="flex bg-gray-800 rounded-lg p-0.5 scale-90 origin-right">
                                                    <button
                                                        onClick={() => setSettlementMode('direct')}
                                                        className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${
                                                            settlementMode === 'direct' ? 'bg-gray-700 text-white' : 'text-gray-500'
                                                        }`}
                                                    >
                                                        Direct
                                                    </button>
                                                    <button
                                                        onClick={() => setSettlementMode('simplified')}
                                                        className={`px-3 py-1 text-[10px] font-medium rounded-md transition-colors ${
                                                            settlementMode === 'simplified' ? 'bg-gray-700 text-white' : 'text-gray-500'
                                                        }`}
                                                    >
                                                        Simplified
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex m-3 bg-gray-800 rounded-lg p-0.5">
                                            <button
                                                onClick={() => setDebtTab('mine')}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                    debtTab === 'mine' ? 'bg-gray-700 text-white' : 'text-gray-400'
                                                }`}
                                            >
                                                Your Balances
                                            </button>
                                            <button
                                                onClick={() => setDebtTab('group')}
                                                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                                    debtTab === 'group' ? 'bg-gray-700 text-white' : 'text-gray-400'
                                                }`}
                                            >
                                                Group Summary
                                            </button>
                                        </div>

                                        {/* Your Balances tab */}
                                        {debtTab === 'mine' && (
                                            <div className="divide-y divide-gray-800/60 pb-2">
                                                {myDebts.length === 0 ? (
                                                    <p className="text-gray-500 text-sm text-center py-4">You're all settled up! 🎉</p>
                                                ) : myDebts.map((debt, i) => (
                                                    <div key={i} className="flex items-center justify-between px-4 py-2.5">
                                                        <span className="text-gray-300 text-sm">
                                                            {debt.fromName === 'You' ? (
                                                                <>You owe <span className="text-white font-medium">{debt.toName}</span></>
                                                            ) : (
                                                                <><span className="text-white font-medium">{debt.fromName}</span> owes you</>
                                                            )}
                                                        </span>
                                                        <span className={`${debt.fromName === 'You' ? 'text-red-400' : 'text-green-400'} text-sm font-semibold`}>
                                                            ₹{debt.amount.toFixed(2)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Group Summary tab */}
                                        {debtTab === 'group' && (
                                            <div className="divide-y divide-gray-800/60 pb-2">
                                                {memberSummary.length === 0 ? (
                                                    <p className="text-gray-500 text-sm text-center py-4">All settled up! 🎉</p>
                                                ) : memberSummary.map(([key, { name, netAmount }]) => (
                                                    <div key={key} className="flex items-center justify-between px-4 py-2.5">
                                                        <span className="text-gray-300 text-sm font-medium">{name}</span>
                                                        {netAmount > 0.01 ? (
                                                            <span className="text-green-400 text-sm font-semibold">gets back ₹{netAmount.toFixed(2)}</span>
                                                        ) : netAmount < -0.01 ? (
                                                            <span className="text-red-400 text-sm font-semibold">pays back ₹{Math.abs(netAmount).toFixed(2)}</span>
                                                        ) : (
                                                            <span className="text-gray-500 text-xs italic">Settled up</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )
                    })()}

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
                                        {member.is_guest ? (
                                            <User size={12} className="text-indigo-300" />
                                        ) : (
                                            <span className="text-indigo-300 text-xs font-medium">
                                                {member.users?.name?.[0]?.toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-gray-300 text-xs flex items-center gap-1.5">
                                        {member.is_guest ? member.guest_name : (member.users?.name || member.users?.email)}
                                        {member.is_guest && <span className="bg-gray-800 text-[10px] px-1.5 py-0.5 rounded text-gray-400">Guest</span>}
                                    </span>
                                    {member.is_guest && (
                                        <button 
                                            onClick={() => removeGuest(member.id)}
                                            className="ml-1 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Expenses */}
                    <div>
                        <h2 className="text-gray-400 text-sm font-medium mb-3">Expenses</h2>
                        
                        {expenses.length > 0 && (
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search title, category, or amount..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                                />
                            </div>
                        )}

                        {expenses.length === 0 ? (
                            <Card className="bg-gray-900 border-gray-800 p-6 text-center">
                                <Receipt size={28} className="text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">No expenses yet</p>
                                <p className="text-gray-600 text-xs mt-1">Add the first expense for this group</p>
                            </Card>
                        ) : filteredExpenses.length === 0 ? (
                            <Card className="bg-gray-900 border-gray-800 p-6 text-center">
                                <Search size={28} className="text-gray-600 mx-auto mb-2" />
                                <p className="text-gray-400 text-sm">No expenses found</p>
                                <p className="text-gray-600 text-xs mt-1">Try adjusting your search</p>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                {filteredExpenses.map((expense: any) => (
                                    <Card key={expense.id} className="bg-gray-900 border-gray-800 p-4">
                                        <div className="flex flex-row items-center justify-between gap-3">
                                            {/* Left: icon + title + amount */}
                                            <div className="flex flex-row items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-10 h-10 ${(CATEGORY_ICONS[expense.category] || CATEGORY_ICONS['Other']).bg} rounded-xl flex items-center justify-center shrink-0`}>
                                                    {(() => { const C = (CATEGORY_ICONS[expense.category] || CATEGORY_ICONS['Other']).icon; const col = (CATEGORY_ICONS[expense.category] || CATEGORY_ICONS['Other']).color; return <C size={18} className={col} /> })()}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{expense.title}</p>
                                                    <p className="text-white text-sm font-semibold">₹{expense.amount}</p>
                                                </div>
                                            </div>
                                            {/* Right: paid by + edit/delete */}
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <p className="text-gray-500 text-xs text-right">
                                                    {(() => {
                                                        if (expense.paid_by_guest) {
                                                            const guestPayer = members.find((m: any) => m.id === expense.paid_by_guest)
                                                            return `Paid by ${guestPayer?.guest_name || 'Guest'}`
                                                        }
                                                        if (expense.paid_by === currentUser?.id) return 'Paid by you'
                                                        const payer = members.find((m: any) => m.user_id === expense.paid_by)
                                                        return `Paid by ${payer?.users?.name || payer?.users?.email || 'Unknown'}`
                                                    })()}
                                                </p>
                                                <div className="flex flex-row items-center gap-2">
                                                    <button
                                                        onClick={() => router.push(`/dashboard/groups/${id}/edit-expense/${expense.id}`)}
                                                        className="text-gray-500 hover:text-indigo-400 transition-colors"
                                                        title="Edit expense"
                                                    >
                                                        <Pencil size={13} />
                                                    </button>
                                                    <button
                                                        onClick={() => deleteExpense(expense.id)}
                                                        className="text-gray-500 hover:text-red-400 transition-colors"
                                                        title="Delete expense"
                                                    >
                                                        <Trash2 size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex-1 overflow-hidden flex flex-col pt-2 relative">
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
                        {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center px-4">
                                <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mb-4">
                                    <MessageSquare size={24} className="text-gray-600" />
                                </div>
                                <p className="text-gray-400 font-medium">No messages yet</p>
                                <p className="text-gray-600 text-sm mt-1">Start the conversation or request an expense to be added.</p>
                            </div>
                        ) : (
                            messages.map((msg, i) => {
                                const isMe = msg.user_id === currentUser?.id
                                const senderName = msg.users?.name || msg.users?.email?.split('@')[0] || 'Unknown'
                                const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                
                                // Show sender name if it's not from me, and the previous message wasn't from the same person
                                const showName = !isMe && (i === 0 || messages[i-1].user_id !== msg.user_id)

                                if (msg.type === 'expense_request') {
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[85%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                                            {showName && <span className="text-gray-500 text-[10px] ml-1 mb-1">{senderName}</span>}
                                            <Card className={`p-0 overflow-hidden border ${msg.is_resolved ? 'bg-gray-900 border-gray-800' : 'bg-indigo-950/20 border-indigo-500/30'}`}>
                                                <div className={`px-4 py-3 flex gap-3 ${msg.is_resolved ? 'opacity-60' : ''}`}>
                                                    <div className={`mt-0.5 p-1.5 rounded-full h-fit ${msg.is_resolved ? 'bg-gray-800 text-gray-400' : 'bg-yellow-500/20 text-yellow-500'}`}>
                                                        <Bell size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="text-white text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                        <p className="text-gray-500 text-[10px] mt-1.5 text-right">{time} {!isMe && !msg.is_resolved ? '• Expense Request' : ''}</p>
                                                    </div>
                                                </div>
                                                
                                                {!msg.is_resolved && (
                                                    <div className="border-t border-indigo-500/20 px-4 py-2 bg-indigo-950/40 flex justify-end">
                                                        <button 
                                                            onClick={() => resolveExpenseRequest(msg.id)}
                                                            className="text-xs font-semibold text-green-400 hover:text-green-300 py-1 px-2 rounded hover:bg-green-500/10 transition-colors"
                                                        >
                                                            Mark as Done
                                                        </button>
                                                    </div>
                                                )}
                                                {msg.is_resolved && (
                                                    <div className="border-t border-gray-800 px-4 py-2 bg-gray-900 flex justify-end">
                                                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                                                            <CheckCircle size={12} /> Resolved
                                                        </span>
                                                    </div>
                                                )}
                                            </Card>
                                        </div>
                                    )
                                }

                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[80%] ${isMe ? 'ml-auto' : 'mr-auto'}`}>
                                        {showName && <span className="text-gray-500 text-[10px] ml-1 mb-1">{senderName}</span>}
                                        <div className={`px-4 py-2.5 rounded-2xl relative ${isMe ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-800 text-gray-100 rounded-bl-sm'}`}>
                                            <p className="text-sm whitespace-pre-wrap font-medium">{msg.content}</p>
                                            <div className={`text-[10px] flex justify-end mt-1 ${isMe ? 'text-indigo-200' : 'text-gray-500'}`}>
                                                {time}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input */}
                    <div className="bg-black p-4 pb-6 border-t border-gray-900 border-t-2 border-dashed">
                        {/* Quick Actions */}
                        <div className="mb-3 flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
                            <button
                                onClick={() => sendMessage('expense_request', 'Can someone add the latest expense here please?')}
                                disabled={sending}
                                className="flex-shrink-0 bg-gray-900 hover:bg-gray-800 text-indigo-400 border border-gray-800 rounded-full px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors"
                            >
                                <Bell size={12} /> Request Expense
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-900 border border-gray-800 rounded-full flex items-center px-4 relative">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && sendMessage('message')}
                                    placeholder="Type a message..."
                                    className="w-full bg-transparent py-3 text-sm text-white focus:outline-none placeholder:text-gray-500"
                                />
                            </div>
                            <button
                                onClick={() => sendMessage('message')}
                                disabled={!newMessage.trim() || sending}
                                className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 flex flex-col items-center justify-center text-white flex-shrink-0 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
                            >
                                <Send size={18} className="ml-1" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}