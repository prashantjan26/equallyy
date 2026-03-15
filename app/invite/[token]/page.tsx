'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users, AlertCircle } from 'lucide-react'

export default function InviteAcceptPage() {
    const { token } = useParams()
    const router = useRouter()
    const supabase = createClient()

    const [invite, setInvite] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [joining, setJoining] = useState(false)

    useEffect(() => {
        if (token) fetchInvite()
    }, [token])

    async function fetchInvite() {
        const { data, error } = await supabase
            .from('group_invites')
            .select(`
                *,
                groups (
                    name
                )
            `)
            .eq('token', token)
            .single()

        if (error || !data) {
            setError('Invite link is invalid or has expired.')
        } else if (new Date(data.expires_at) < new Date()) {
            setError('This invite link has expired.')
        } else {
            setInvite(data)
        }
        setLoading(false)
    }

    async function joinGroup() {
        setJoining(true)
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            router.push(`/login?redirect=/invite/${token}`)
            return
        }

        const { error: joinError } = await supabase
            .from('group_members')
            .insert({
                group_id: invite.group_id,
                user_id: user.id,
                is_guest: false
            })

        // Redirect to group page
        router.push(`/dashboard/groups/${invite.group_id}`)
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="animate-pulse flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-900 rounded-full mb-4"></div>
                <div className="h-4 w-32 bg-gray-900 rounded"></div>
            </div>
        </div>
    )

    if (error) return (
        <div className="flex items-center justify-center min-h-screen bg-black p-4">
            <Card className="bg-gray-900 border-gray-800 p-6 max-w-sm w-full text-center">
                <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h1 className="text-white text-lg font-bold mb-2">Invalid Invite</h1>
                <p className="text-gray-400 text-sm mb-6">{error}</p>
                <Button 
                    onClick={() => router.push('/')}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                    Go Home
                </Button>
            </Card>
        </div>
    )

    return (
        <div className="flex items-center justify-center min-h-screen bg-black p-4">
            <Card className="bg-gray-900 border-gray-800 p-8 max-w-sm w-full text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                
                <div className="w-16 h-16 bg-indigo-600/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Users size={28} className="text-indigo-400" />
                </div>
                
                <h1 className="text-white text-xl font-bold mb-1">You've been invited!</h1>
                <p className="text-gray-400 text-sm mb-6">
                    Join <span className="text-indigo-300 font-semibold">{invite?.groups?.name}</span> to start splitting expenses.
                </p>
                
                <Button 
                    onClick={joinGroup}
                    disabled={joining}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl py-6 text-base font-semibold"
                >
                    {joining ? 'Joining...' : 'Join Group'}
                </Button>
            </Card>
        </div>
    )
}
