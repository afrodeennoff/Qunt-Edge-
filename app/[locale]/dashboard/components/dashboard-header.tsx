'use client'

import { useState } from 'react'
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import ImportButton from './import/import-button'
import { useKeyboardShortcuts } from '../../../../hooks/use-keyboard-shortcuts'
import { ActiveFilterTags } from './filters/active-filter-tags'
import { AnimatePresence } from 'framer-motion'
import { FilterCommandMenu } from './filters/filter-command-menu'
import ReferralButton from './referral-button'
import { useSidebarStore } from '@/store/sidebar-store'

export default function DashboardHeader() {
    const [showAccountNumbers, setShowAccountNumbers] = useState(true)
    const { setOpen } = useSidebarStore()

    // Initialize keyboard shortcuts
    useKeyboardShortcuts()

    return (
        <>
            <header className="sticky top-0 z-20 flex flex-col text-primary bg-background/80 backdrop-blur-md border-b shadow-xs w-full">
                <div className="flex items-center justify-between px-4 sm:px-6 h-16">
                    <div className="flex items-center gap-x-4">
                        {/* Mobile Sidebar Trigger */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="lg:hidden"
                            onClick={() => setOpen(true)}
                        >
                            <Menu className="h-5 w-5" />
                        </Button>

                        <div className="hidden md:block">
                            <FilterCommandMenu variant="navbar" />
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className='hidden md:flex gap-x-4'>
                            <ImportButton />
                        </div>
                        <div className="flex items-center gap-2">
                            <ReferralButton />
                        </div>
                    </div>
                </div>
                <AnimatePresence>
                    <ActiveFilterTags showAccountNumbers={showAccountNumbers} />
                </AnimatePresence>
            </header>
        </>
    )
}
