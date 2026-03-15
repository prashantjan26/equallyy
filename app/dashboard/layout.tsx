'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Users, Wallet, Map, User } from 'lucide-react'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (!user) router.push('/login')
        })
    }, [])

    const navItems = [
        { href: '/dashboard', icon: Home, label: 'Home' },
        { href: '/dashboard/groups', icon: Users, label: 'Groups' },
        { href: '/dashboard/personal', icon: Wallet, label: 'Personal' },
        { href: '/dashboard/trips', icon: Map, label: 'Trips' },
        { href: '/dashboard/profile', icon: User, label: 'Profile' },
    ]

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Main content */}
            <main className="pb-20 max-w-md mx-auto">
                {children}
            </main>

            {/* Bottom navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
                <div className="max-w-md mx-auto flex items-center justify-around py-2">
                    {navItems.map(({ href, icon: Icon, label }) => {
                        const isActive = pathname === href
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition ${isActive ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'
                                    }`}
                            >
                                <Icon size={22} />
                                <span className="text-xs">{label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>
        </div>
    )
}