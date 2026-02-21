'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, CheckCircle, Send } from 'lucide-react'
import { toast } from '@/components/ui/Toast'

interface Props {
    isOpen: boolean
    onClose: () => void
    proposalId: string
    proposalTitle: string
}

export default function SubscribeModal({ isOpen, onClose, proposalId, proposalTitle }: Props) {
    const [token, setToken] = useState('')
    const [chatId, setChatId] = useState('')
    const [loading, setLoading] = useState(false)

    const handleTest = () => {
        if (!token || !chatId) {
            toast('Please enter both Token and Chat ID', 'error')
            return
        }

        setLoading(true)
        setTimeout(() => {
            setLoading(false)
            toast('Test payload sent! Check your Telegram', 'success')
            onClose()
        }, 1000)
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-bkg-2 border border-bkg-3 p-6 rounded-2xl shadow-2xl z-50"
                    >
                        <div className="flex items-start justify-between mb-6">
                            <div className="flex items-center gap-3 text-primary">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Bell size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-fgd-1">DAO Alerts</h2>
                                    <p className="text-xs text-fgd-4">via Telegram Bot</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-fgd-4 hover:text-white transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-fgd-3 mb-4">
                                    Get instant notifications when DAOs vote on the proposal <span className="text-white font-medium">"{proposalTitle}"</span>.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-fgd-3 mb-1">Bot Token</label>
                                <input
                                    type="password"
                                    value={token}
                                    onChange={(e) => setToken(e.target.value)}
                                    placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                                    className="w-full bg-bkg-1 border border-bkg-3 rounded-xl px-3 py-2 text-sm text-fgd-1 placeholder-fgd-4 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(203,100%,59%,0.1)] transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-fgd-3 mb-1">Chat ID</label>
                                <input
                                    type="text"
                                    value={chatId}
                                    onChange={(e) => setChatId(e.target.value)}
                                    placeholder="-1001234567890"
                                    className="w-full bg-bkg-1 border border-bkg-3 rounded-xl px-3 py-2 text-sm text-fgd-1 placeholder-fgd-4 focus:outline-none focus:border-primary/50 focus:shadow-[0_0_0_3px_rgba(203,100%,59%,0.1)] transition-all"
                                />
                            </div>

                            <button
                                onClick={handleTest}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-all mt-6"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={16} /> Send Test Payload
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
