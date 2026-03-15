'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Utensils, Car, Receipt, Tv, Wifi, Home, ShoppingBag, MoreHorizontal } from 'lucide-react'

const CATEGORIES = [
    { id: 'Food', icon: Utensils, label: 'Food' },
    { id: 'Transport', icon: Car, label: 'Transport' },
    { id: 'Bills', icon: Receipt, label: 'Bills' },
    { id: 'OTT', icon: Tv, label: 'OTT' },
    { id: 'WiFi', icon: Wifi, label: 'WiFi' },
    { id: 'Rent', icon: Home, label: 'Rent' },
    { id: 'Shopping', icon: ShoppingBag, label: 'Shopping' },
    { id: 'Other', icon: MoreHorizontal, label: 'Other' }
]

export default function AddPersonalExpensePage() {
    const router = useRouter()
    const supabase = createClient()

    const [title, setTitle] = useState('')
    const [amount, setAmount] = useState('')
    const [category, setCategory] = useState('Food')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSave(e: React.FormEvent) {
        e.preventDefault()
        if (!title || !amount || !category || !date) return

        setSaving(true)
        setError(null)

        const expenseAmount = parseFloat(amount)
        if (isNaN(expenseAmount) || expenseAmount <= 0) {
            setError("Please enter a valid amount")
            setSaving(false)
            return
        }

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            setError("You must be logged in to add an expense")
            setSaving(false)
            return
        }

        const { error: insertError } = await supabase
            .from('personal_expenses')
            .insert({
                user_id: user.id,
                title,
                amount: expenseAmount,
                category,
                date: new Date(date).toISOString()
            })

        if (insertError) {
            setError(insertError.message || "Failed to add expense")
            setSaving(false)
            return
        }

        setSaving(false)
        router.push('/dashboard/personal')
    }

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="pt-6 flex items-center gap-3 mb-2">
                <Link href="/dashboard/personal">
                    <button className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
                        <ArrowLeft size={18} className="text-gray-400" />
                    </button>
                </Link>
                <h1 className="text-xl font-bold text-white">Add Personal Expense</h1>
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
                            placeholder="e.g. Groceries"
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
                    <div className="grid grid-cols-4 gap-2">
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
                                    <span className="text-[10px] font-medium leading-none">{cat.label}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>

                {/* Date */}
                <div>
                    <label className="text-gray-400 text-xs font-medium mb-1.5 block">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600/50 [color-scheme:dark]"
                        required
                    />
                </div>

                {/* Submit */}
                <Button 
                    type="submit" 
                    disabled={saving}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 text-base font-medium mt-4"
                >
                    {saving ? 'Saving...' : 'Add Expense'}
                </Button>
            </form>
        </div>
    )
}
