'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, UserPlus, Link as LinkIcon, Copy, Check, Trash2, Share2, User } from 'lucide-react'
import Link from 'next/link'

export default function InvitePage() {
    const params = useParams()
    const id = Array.isArray(params.id) ? params.id[0] : params.id
    
    const router = useRouter()
    const supabase = createClient()

    const [guestName, setGuestName] = useState('')
    const [guests, setGuests] = useState<any[]>([])
    const [inviteLink, setInviteLink] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [addingGuest, setAddingGuest] = useState(false)
    const [generatingLink, setGeneratingLink] = useState(false)
    const [copied, setCopied] = useState(false)
    const [groupName, setGroupName] = useState('')

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    async function fetchData() {
        // Fetch group name
        const { data: group, error: groupError } = await supabase.from('groups').select('name').eq('id', id).single()
        if (group) setGroupName(group.name)

        // Fetch guests
        const { data: members, error: membersError } = await supabase
            .from('group_members')
            .select('*')
            .eq('group_id', id)
            .eq('is_guest', true)
        
        if (members) setGuests(members)

        // Fetch active invite link
        const { data: invites, error: invitesError } = await supabase
            .from('group_invites')
            .select('*')
            .eq('group_id', id)
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)

        if (invites && invites.length > 0) {
            setInviteLink(invites[0])
        }

        setLoading(false)
        
        if (membersError) return { error: membersError }
        return { error: null }
    }

    async function addGuest() {
        if (!guestName.trim()) return
        
        // Check for duplicate names
        const nameExists = guests.find(g => g.guest_name.toLowerCase() === guestName.trim().toLowerCase())
        if (nameExists) {
            alert(`"${guestName.trim()}" is already a member of this group.`)
            return
        }

        setAddingGuest(true)

        const payload = {
            group_id: id,
            guest_name: guestName.trim(),
            is_guest: true,
            role: 'member'
        }
        
        console.log("Adding guest with payload:", payload)

        const { data, error } = await supabase
            .from('group_members')
            .insert(payload)
            .select()
            .single()
        
        if (error) {
            console.error("Error adding guest:", JSON.stringify(error, null, 2))
            alert(`Failed to add guest: ${error.message}`)
            setAddingGuest(false)
            return
        }

        if (data) {
            console.log("Guest inserted with ID:", data.id)
            setGuests(prev => [...prev, data])
            setGuestName('')
        }
        setAddingGuest(false)
    }

    async function removeGuest(guestId: string) {
        setLoading(true)
        const { error } = await supabase.from('group_members').delete().eq('id', guestId)
        
        if (error) {
            console.error("Error deleting guest:", error)
            alert(`Failed to delete guest: ${error.message}`)
        } else {
            setGuests(prev => prev.filter(g => g.id !== guestId))
        }
        setLoading(false)
    }

    async function generateInviteLink() {
        setGeneratingLink(true)
        try {
            const token = crypto.randomUUID()
            const expiresAt = new Date()
            expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiration

            console.log("Generating link for group:", id)
            const { data, error } = await supabase
                .from('group_invites')
                .insert({
                    group_id: id,
                    token,
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single()

            if (error) {
                console.error("Error generating link:", JSON.stringify(error, null, 2))
                alert(`Failed to generate link: ${error.message} - ${error.details || ''}`)
            } else if (data) {
                console.log("Link generated:", data)
                setInviteLink(data)
            }
        } catch (e: any) {
            console.error("Caught exception:", e)
            alert(`Exception: ${e.message}`)
        } finally {
            setGeneratingLink(false)
        }
    }

    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/invite/${inviteLink?.token}` : ''

    function copyLink() {
        navigator.clipboard.writeText(shareUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    function shareWhatsApp() {
        const text = encodeURIComponent(`Join my group "${groupName}" on Equallyy to split expenses! ${shareUrl}`)
        window.open(`https://wa.me/?text=${text}`, '_blank')
    }

    if (loading) return (
        <div className="p-4 pt-10 space-y-4">
            <div className="h-16 bg-gray-900 rounded-2xl animate-pulse" />
            <div className="h-32 bg-gray-900 rounded-2xl animate-pulse" />
        </div>
    )

    return (
        <div className="flex flex-col h-screen overflow-y-auto pb-24">
            <div className="p-4 space-y-5 flex-shrink-0 relative z-10 bg-black pb-0">
                <div className="pt-6 flex items-center gap-3">
                    <Link href={`/dashboard/groups/${id}`}>
                        <button className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center">
                            <ArrowLeft size={18} className="text-gray-400" />
                        </button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold text-white">Invite Members</h1>
                        <p className="text-gray-400 text-xs">{groupName}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Guest Member Section */}
                <section>
                    <h2 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
                        <UserPlus size={16} className="text-indigo-400" /> 
                        Add Guest Member
                    </h2>
                    <p className="text-gray-500 text-xs mb-4">
                        Add someone without an account just to track their expenses. They can claim this profile later when they join.
                    </p>
                    
                    <Card className="bg-gray-900 border-gray-800 p-4">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Guest name (e.g., Mom)"
                                value={guestName}
                                onChange={(e) => setGuestName(e.target.value)}
                                className="flex-1 bg-black border border-gray-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500"
                                onKeyDown={(e) => e.key === 'Enter' && addGuest()}
                            />
                            <Button 
                                onClick={addGuest}
                                disabled={addingGuest || !guestName.trim()}
                                className="bg-indigo-600 hover:bg-indigo-700 rounded-xl whitespace-nowrap"
                            >
                                {addingGuest ? 'Adding...' : 'Add'}
                            </Button>
                        </div>

                        {guests.length > 0 && (
                            <div className="mt-5 space-y-2 border-t border-gray-800 pt-4">
                                <h3 className="text-gray-400 text-xs font-medium mb-2">Existing Guests</h3>
                                {guests.map(guest => (
                                    <div key={guest.id} className="flex items-center justify-between bg-black/50 rounded-lg p-2.5 border border-gray-800/50">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-7 h-7 bg-indigo-900/40 rounded-full flex items-center justify-center">
                                                <User size={14} className="text-indigo-400" />
                                            </div>
                                            <span className="text-gray-300 text-sm">{guest.guest_name}</span>
                                        </div>
                                        <button 
                                            onClick={() => removeGuest(guest.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </section>

                <div className="h-px bg-gray-900 my-2"></div>

                {/* Invite Link Section */}
                <section>
                    <h2 className="text-gray-300 text-sm font-semibold mb-3 flex items-center gap-2">
                        <LinkIcon size={16} className="text-green-400" /> 
                        Invite Link
                    </h2>
                    <p className="text-gray-500 text-xs mb-4">
                        Share a link so others can join the group with their own accounts.
                    </p>

                    <Card className="bg-gray-900 border-gray-800 p-4">
                        {!inviteLink ? (
                            <div className="text-center py-4">
                                <Button 
                                    onClick={generateInviteLink}
                                    disabled={generatingLink}
                                    className="bg-gray-800 hover:bg-gray-700 text-white rounded-xl"
                                >
                                    <LinkIcon size={16} className="mr-2" />
                                    {generatingLink ? 'Generating...' : 'Generate link'}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="bg-black border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-3">
                                    <div className="text-sm text-gray-300 truncate font-mono">
                                        {shareUrl}
                                    </div>
                                    <button 
                                        onClick={copyLink}
                                        className="w-8 h-8 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors flex-shrink-0"
                                    >
                                        {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                                    </button>
                                </div>

                                <div className="flex gap-2">
                                    <Button 
                                        onClick={shareWhatsApp}
                                        className="flex-1 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl py-2 h-auto"
                                    >
                                        <Share2 size={16} className="mr-2" />
                                        WhatsApp
                                    </Button>
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-gray-500 pt-2 border-t border-gray-800/80">
                                    <span>Created: {new Date(inviteLink.created_at).toLocaleDateString()}</span>
                                    <span>Expires: {new Date(inviteLink.expires_at).toLocaleDateString()}</span>
                                </div>
                            </div>
                        )}
                    </Card>
                </section>
            </div>
        </div>
    )
}
