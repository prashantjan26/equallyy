'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Utensils, Car, Building2, Map, ShoppingBag, MoreHorizontal } from 'lucide-react'

const CATEGORIES = [
    { id: 'Food', icon: Utensils, label: 'Food' },
    { id: 'Transport', icon: Car, label: 'Transport' },
    { id: 'Hotel', icon: Building2, label: 'Hotel' },
    { id: 'Activities', icon: Map, label: 'Activities' },
    { id: 'Shopping', icon: ShoppingBag, label: 'Shopping' },
    { id: 'Other', icon: MoreHorizontal, label: 'Other' }
]

export default function EditExpensePage() {
    const { id, expenseId } = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [category, setCategory] = useState('Food')
    const [paidBy, setPaidBy] = useState<string>('')
    const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal')
    const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
    const [members, setMembers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [originalSplits, setOriginalSplits] = useState<any[]>([])

    useEffect(() => {
        fetchData()
    }, [expenseId])

    async function fetchData() {
        // Fetch the existing expense
        const { data: expense } = await supabase
            .from('expenses')
            .select('*, expense_splits(*)')
            .eq('id', expenseId)
            .single()

        if (expense) {
            setTitle(expense.title)
            setAmount(expense.amount.toString())
            setCategory(expense.category)
            setOriginalSplits(expense.expense_splits || [])

            // Detect if splits are equal
            const splits = expense.expense_splits || []
            const amounts = splits.map((s: any) => s.amount_owed)
            const isEqual = amounts.every((a: number) => Math.abs(a - amounts[0]) <= 0.01)
            setSplitType(isEqual ? 'equal' : 'custom')
        }

        // Fetch members
        const { data: membersData } = await supabase
            .from('group_members')
            .select('*, users(name, email)')
            .eq('group_id', id)

        if (membersData) {
            setMembers(membersData)

            if (expense) {
                // Set the payer: find the group_member that matches paid_by or paid_by_guest
                const payer = expense.paid_by_guest
                    ? membersData.find((m: any) => m.id === expense.paid_by_guest)
                    : membersData.find((m: any) => m.user_id === expense.paid_by)
                if (payer) setPaidBy(payer.id)
                else if (membersData.length > 0) setPaidBy(membersData[0].id)

                // Pre-fill custom splits from existing DB splits
                const customMap: Record<string, string> = {}
                membersData.forEach((member: any) => {
                    const existingSplit = expense.expense_splits?.find(
                        (s: any) => member.is_guest 
                            ? s.guest_member_id === member.id 
                            : s.user_id === member.user_id
                    )
                    if (existingSplit) {
                        customMap[member.id] = existingSplit.amount_owed.toString()
                    } else {
                        customMap[member.id] = '0'
                    }
                })
                setCustomSplits(customMap)
            }
        }

        setLoading(false)
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!title || !amount || !paidBy || !category) return

        setSaving(true)
        setError(null)

        const expenseAmount = parseFloat(amount)
        if (isNaN(expenseAmount) || expenseAmount <= 0) {
            setError('Please enter a valid amount')
            setSaving(false)
            return
        }

        // Validate custom splits
        if (splitType === 'custom') {
            let totalCustom = 0
            for (const member of members) {
                const val = parseFloat(customSplits[member.id] || '0')
                if (isNaN(val) || val < 0) {
                    setError('Invalid custom split amounts')
                    setSaving(false)
                    return
                }
                totalCustom += val
            }
            if (Math.abs(totalCustom - expenseAmount) > 0.01) {
                setError(`Custom splits total (₹${totalCustom.toFixed(2)}) must equal expense amount (₹${expenseAmount.toFixed(2)})`)
                setSaving(false)
                return
            }
        }

        const payer = members.find(m => m.id === paidBy)
        if (!payer) {
            setError('Invalid payer selected')
            setSaving(false)
            return
        }

        // 1. Update expense row
        const { data: updatedExpense, error: updateError } = await supabase
            .from('expenses')
            .update({
                paid_by: payer.is_guest ? null : payer.user_id,
                paid_by_guest: payer.is_guest ? payer.id : null,
                title,
                amount: expenseAmount,
                category
            })
            .eq('id', expenseId)
            .select()

        if (updateError) {
            setError(updateError.message || 'Failed to update expense')
            setSaving(false)
            return
        }
        // If no rows returned, the UPDATE was silently blocked by an RLS policy
        if (!updatedExpense || updatedExpense.length === 0) {
            setError('Update was blocked by Supabase security policy. Please add an UPDATE policy on the expenses table in Supabase (see instructions).')
            setSaving(false)
            return
        }

        // 2. Delete old splits and recreate
        await supabase.from('expense_splits').delete().eq('expense_id', expenseId)

        let splitsToInsert = []
        if (splitType === 'equal') {
            const splitAmount = expenseAmount / members.length
            splitsToInsert = members.map(member => ({
                expense_id: expenseId,
                user_id: member.is_guest ? null : member.user_id,
                guest_member_id: member.is_guest ? member.id : null,
                amount_owed: splitAmount,
                is_settled: false
            }))
        } else {
            splitsToInsert = members.map(member => ({
                expense_id: expenseId,
                user_id: member.is_guest ? null : member.user_id,
                guest_member_id: member.is_guest ? member.id : null,
                amount_owed: parseFloat(customSplits[member.id] || '0'),
                is_settled: false
            })).filter(split => split.amount_owed > 0)
        }

        const { error: splitsError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert)

        if (splitsError) {
            setError(splitsError.message || 'Failed to update expense splits')
            setSaving(false)
            return
        }

        setSaving(false)
        router.push(`/dashboard/groups/${id}`)
    }

    if (loading) {
        return (
            <div className="p-4 pt-10 space-y-4">
                <div className="h-10 bg-gray-900 rounded-xl animate-pulse w-1/3 mb-6" />
                <div className="h-14 bg-gray-900 rounded-xl animate-pulse" />
                <div className="h-14 bg-gray-900 rounded-xl animate-pulse" />
                <div className="h-32 bg-gray-900 rounded-xl animate-pulse" />
            </div>
        )
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="pt-6 flex items-center gap-3 mb-2">
                <Link href={`/dashboard/groups/${id}`}>
                    <button className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                </Link>
                <h1 className="text-xl font-bold text-white">Edit Expense</h1>
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-sm">
                    {error}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
                {/* Basic Details */}
                <div className="space-y-4">
                    <div>
                        <label className="text-gray-400 text-xs font-medium mb-1.5 block">What was it for?</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="e.g. Dinner"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                            required
                        />
                    </div>

                    <div>
                        <label className="text-gray-400 text-xs font-medium mb-1.5 block">Amount (₹)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/50 text-xl font-semibold"
                            required
                        />
                    </div>
                </div>

                {/* Category */}
                <div>
                    <label className="text-gray-400 text-xs font-medium mb-2 block">Category</label>
                    <div className="grid grid-cols-3 gap-2">
                        {CATEGORIES.map(cat => {
                            const Icon = cat.icon
                            const isSelected = category === cat.id
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategory(cat.id)}
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                                        isSelected
                                            ? 'bg-indigo-600/10 border-indigo-500/50 text-indigo-400'
                                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800/50'
                                    }`}
                                >
                                    <Icon size={20} className="mb-1.5" />
                                    <span className="text-xs font-medium">{cat.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Paid By */}
                <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Paid By</label>
                    <select
                        value={paidBy}
                        onChange={e => setPaidBy(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50"
                        required
                    >
                        <option value="" disabled>Select who paid</option>
                        {members.map(member => (
                            <option key={member.id} value={member.id}>
                                {member.is_guest ? `${member.guest_name} (Guest)` : (member.users?.name || member.users?.email)}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Split Strategy */}
                <Card className="bg-gray-900 border-gray-800 p-4 flex flex-col gap-2">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Split Strategy</span>
                        <div className="flex bg-gray-800 rounded-lg p-1">
                            <button
                                type="button"
                                onClick={() => setSplitType('equal')}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${splitType === 'equal' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                            >
                                Equally
                            </button>
                            <button
                                type="button"
                                onClick={() => setSplitType('custom')}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${splitType === 'custom' ? 'bg-indigo-600 text-white' : 'text-gray-400'}`}
                            >
                                Custom
                            </button>
                        </div>
                    </div>

                    {splitType === 'equal' && amount && !isNaN(parseFloat(amount)) && members.length > 0 && (
                        <div className="mt-1 pt-3 border-t border-gray-800">
                            <p className="text-white text-sm text-center">
                                Everyone owes <span className="font-semibold text-green-400">₹{(parseFloat(amount) / members.length).toFixed(2)}</span>
                            </p>
                        </div>
                    )}

                    {splitType === 'custom' && (
                        <div className="mt-1 pt-3 border-t border-gray-800 space-y-3">
                            {members.map(member => (
                                <div key={member.id} className="flex items-center justify-between">
                                    <span className="text-gray-300 text-sm">
                                        {member.is_guest ? `${member.guest_name} (Guest)` : (member.users?.name || member.users?.email)}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-gray-500 text-sm">₹</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={customSplits[member.id] || ''}
                                            onChange={e => setCustomSplits(prev => ({ ...prev, [member.id]: e.target.value }))}
                                            placeholder="0.00"
                                            className="w-24 bg-gray-800 border border-gray-700 rounded-lg p-1.5 text-right text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Submit */}
                <Button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 text-base font-medium mt-4"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </form>
        </div>
    )
}
