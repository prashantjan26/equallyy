'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Plus, Search, X, Wallet, Utensils, Car, Receipt, Tv, Wifi, Home, ShoppingBag, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'

const CATEGORY_META: Record<string, { icon: any; emoji: string; color: string; query: string; gradient: string }> = {
    Food:      { icon: Utensils,      emoji: '🍔', color: 'bg-orange-500', query: 'food,restaurant',  gradient: 'linear-gradient(135deg,#431407 0%,#7c2d12 60%,#431407 100%)' },
    Transport: { icon: Car,           emoji: '🚗', color: 'bg-blue-500',   query: 'transport,travel', gradient: 'linear-gradient(135deg,#0c1445 0%,#1e3a8a 60%,#0c1445 100%)' },
    Bills:     { icon: Receipt,       emoji: '🧾', color: 'bg-red-500',    query: 'bills,finance',   gradient: 'linear-gradient(135deg,#3b0000 0%,#7f1d1d 60%,#3b0000 100%)' },
    OTT:       { icon: Tv,            emoji: '📺', color: 'bg-purple-500', query: 'streaming,tv',    gradient: 'linear-gradient(135deg,#2e1065 0%,#4c1d95 60%,#2e1065 100%)' },
    WiFi:      { icon: Wifi,          emoji: '📶', color: 'bg-cyan-500',   query: 'technology,wifi', gradient: 'linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0c4a6e 100%)' },
    Rent:      { icon: Home,          emoji: '🏠', color: 'bg-emerald-500',query: 'home,apartment',  gradient: 'linear-gradient(135deg,#052e16 0%,#14532d 60%,#052e16 100%)' },
    Shopping:  { icon: ShoppingBag,   emoji: '🛍️', color: 'bg-pink-500',   query: 'shopping,mall',  gradient: 'linear-gradient(135deg,#500724 0%,#9f1239 60%,#500724 100%)' },
    Other:     { icon: MoreHorizontal,emoji: '📦', color: 'bg-gray-500',   query: 'lifestyle',       gradient: 'linear-gradient(135deg,#111827 0%,#1f2937 60%,#111827 100%)' },
}

function getCategoryMeta(cat: string) {
    return CATEGORY_META[cat] ?? CATEGORY_META['Other']
}

function getImageUrl(title: string, category: string) {
    const meta = getCategoryMeta(category)
    return `https://source.unsplash.com/featured/800x400/?${encodeURIComponent(title + ',' + meta.query)}`
}

export default function PersonalExpensesPage() {
    const supabase = createClient()
    const [expenses, setExpenses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [totalAmount, setTotalAmount] = useState(0)
    const [categoryTotals, setCategoryTotals] = useState<Record<string, number>>({})
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearch, setShowSearch] = useState(false)
    const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({})

    useEffect(() => { fetchExpenses() }, [])

    async function fetchExpenses() {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('personal_expenses')
            .select('*')
            .eq('user_id', user.id)
            .order('date', { ascending: false })

        if (data) {
            setExpenses(data)
            let total = 0
            const totals: Record<string, number> = {}
            data.forEach(exp => {
                total += exp.amount
                totals[exp.category] = (totals[exp.category] || 0) + exp.amount
            })
            setTotalAmount(total)
            setCategoryTotals(totals)
        }
        setLoading(false)
    }

    const sortedCategories = Object.entries(categoryTotals).sort(([, a], [, b]) => b - a)
    const maxCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0][1] : 0

    const filteredExpenses = expenses.filter(e =>
        !searchQuery ||
        e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.category?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    if (loading) {
        return (
            <div className="p-4 pt-10 space-y-4">
                <div className="h-10 bg-gray-900 rounded-2xl animate-pulse w-44" />
                <div className="h-24 bg-gray-900 rounded-2xl animate-pulse" />
                {[1, 2, 3].map(i => <div key={i} className="h-44 bg-gray-900 rounded-3xl animate-pulse" />)}
            </div>
        )
    }

    return (
        <>
            <style>{`
                @keyframes floatUp {
                    from { opacity: 0; transform: translateY(24px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                @keyframes floatBob {
                    0%, 100% { transform: translateY(0px); }
                    50%      { transform: translateY(-5px); }
                }
                .card-enter { animation: floatUp 0.5s cubic-bezier(0.22,1,0.36,1) both; }
                .card-bob   { animation: floatBob 3.5s ease-in-out infinite; }
            `}</style>

            <div className="p-4 space-y-5 bg-gray-950 pb-32">
                {/* Header */}
                <div className="pt-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight italic">My Expenses</h1>
                        <p className="text-gray-500 text-sm font-medium">₹{totalAmount.toLocaleString('en-IN')} total spent</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => { setShowSearch(v => !v); setSearchQuery('') }}
                            className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition"
                        >
                            {showSearch ? <X size={18} /> : <Search size={18} />}
                        </button>
                        <Link href="/dashboard/personal/add">
                            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-10 px-4 font-bold shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center gap-1.5">
                                <Plus size={18} strokeWidth={3} />
                                Add
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Search */}
                {showSearch && (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search title or category..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-9 pr-9 py-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                <X size={16} />
                            </button>
                        )}
                    </div>
                )}

                {/* Spending breakdown — compact pill row */}
                {sortedCategories.length > 0 && (
                    <div>
                        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Breakdown</p>
                        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
                            {sortedCategories.map(([cat, amt]) => {
                                const meta = getCategoryMeta(cat)
                                const pct = Math.round((amt / totalAmount) * 100)
                                const barW = Math.max(4, Math.round((amt / maxCategoryAmount) * 100))
                                return (
                                    <div key={cat}>
                                        <div className="flex justify-between items-center mb-1 text-xs">
                                            <div className="flex items-center gap-1.5 text-gray-300 font-medium">
                                                <span>{meta.emoji}</span> {cat}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-white font-bold">₹{amt.toLocaleString('en-IN')}</span>
                                                <span className="text-gray-600 w-7 text-right">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                            <div className={`h-full ${meta.color} rounded-full`} style={{ width: `${barW}%` }} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Expense cards */}
                <div>
                    <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Recent Expenses</p>
                    {expenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="text-6xl mb-5">💸</div>
                            <h2 className="text-xl font-bold text-white mb-2">No expenses yet</h2>
                            <p className="text-gray-500 text-sm mb-8 max-w-[240px] leading-relaxed">
                                Start tracking your personal spending by adding your first expense.
                            </p>
                            <Link href="/dashboard/personal/add">
                                <Button className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-2xl h-12 px-8 font-bold shadow-xl shadow-indigo-500/30">
                                    Add first expense
                                </Button>
                            </Link>
                        </div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Search size={32} className="text-gray-700 mb-3" />
                            <p className="text-white font-bold">No results for "{searchQuery}"</p>
                            <p className="text-gray-500 text-sm mt-1">Try a different term</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredExpenses.map((expense, index) => {
                                const meta = getCategoryMeta(expense.category)
                                const imageUrl = getImageUrl(expense.title, expense.category)
                                const imgFailed = imgErrors[expense.id]
                                const delay = index * 80
                                const bobDuration = index % 2 === 0 ? '3.5s' : '4.2s'

                                return (
                                    <div
                                        key={expense.id}
                                        className="card-enter card-bob relative rounded-3xl overflow-hidden cursor-pointer"
                                        style={{
                                            animationDelay: `${delay}ms`,
                                            minHeight: '180px',
                                        }}
                                    >
                                        {/* Background image or gradient fallback */}
                                        {!imgFailed ? (
                                            <img
                                                src={imageUrl}
                                                alt={expense.title}
                                                className="absolute inset-0 w-full h-full object-cover"
                                                onError={() => setImgErrors(prev => ({ ...prev, [expense.id]: true }))}
                                            />
                                        ) : (
                                            <div className="absolute inset-0" style={{ background: meta.gradient }} />
                                        )}

                                        {/* Dark overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-black/10" />
                                        {/* Hover glow ring */}
                                        <div className="absolute inset-0 rounded-3xl ring-0 hover:ring-2 ring-white/20 transition-all duration-300" />

                                        <div
                                            className="relative h-full p-5 flex flex-col justify-between transition-transform duration-300 hover:scale-[1.015]"
                                            style={{ minHeight: '180px', animationDelay: `${delay}ms`, animationDuration: bobDuration }}
                                        >
                                            {/* Top row */}
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-3 py-1">
                                                    <span className="text-sm">{meta.emoji}</span>
                                                    <span className="text-[10px] font-black text-white uppercase tracking-widest">{expense.category}</span>
                                                </div>
                                                <div className="flex items-center gap-1 bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-2.5 py-1">
                                                    <span className="text-[10px] font-bold text-gray-200">
                                                        {new Date(expense.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Bottom */}
                                            <div className="flex items-end justify-between mt-auto">
                                                <div>
                                                    <h3 className="text-white font-black text-lg leading-tight drop-shadow-md">{expense.title}</h3>
                                                    <p className="text-gray-400 text-xs mt-0.5">Personal expense</p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="text-2xl font-black text-emerald-400 drop-shadow-md">
                                                        ₹{expense.amount.toLocaleString('en-IN')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
