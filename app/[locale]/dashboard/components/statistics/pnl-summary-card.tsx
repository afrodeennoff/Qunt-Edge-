'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserStore } from "@/store/user-store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const PnlSummaryCard = () => {
    const accounts = useUserStore((state) => state.accounts);

    // Filter for active accounts or sort by importance
    // For now, list all connected accounts
    const activeAccounts = accounts?.filter(acc => acc.metrics?.isConfigured) || [];

    return (
        <Card className="h-full flex flex-col bg-card/50 backdrop-blur-sm border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                    Prop Firm Accounts
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto no-scrollbar flex-grow pr-1">
                {activeAccounts.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-4">
                        No active accounts configured.
                    </div>
                ) : (
                    activeAccounts.map((acc, i) => {
                        const balance = acc.metrics?.currentBalance || 0;
                        // Assuming we have a target if it's a prop firm evaluation, usually setup in account settings
                        // If explicit target isn't available in metrics, we might need to deduce or show progress relative to drawdown?
                        // "progress" in metrics usually refers to target progress.
                        const progress = acc.metrics?.progress || 0;
                        const targetBalance = (balance + (acc.metrics?.remainingToTarget || 0)); // Approx target if accurate

                        // Determine status color/label
                        const isFunded = progress >= 100;
                        const statusLabel = isFunded ? 'Funded' : 'Active';
                        const statusColor = isFunded
                            ? 'bg-teal-500/10 text-teal-500 border-teal-500/20'
                            : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/10';

                        return (
                            <motion.div
                                key={acc.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                className="p-3 bg-secondary/50 border border-border/50 rounded-xl hover:border-primary/20 transition-all group"
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full transition-colors",
                                            "bg-zinc-500 group-hover:bg-primary"
                                        )}></span>
                                        <span className="font-bold text-foreground text-xs md:text-sm">
                                            {acc.number}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "text-[9px] font-bold uppercase px-2 py-0.5 rounded border",
                                        statusColor
                                    )}>
                                        {statusLabel}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between text-[10px] text-muted-foreground">
                                        <span>Target Progress</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="h-1 bg-secondary rounded-full overflow-hidden">
                                        <motion.div
                                            className="h-full bg-primary transition-all duration-1000"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-mono mt-1">
                                        <span className="text-foreground font-bold">
                                            ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </span>
                                        <span className="text-muted-foreground">
                                            / ${targetBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                        </span>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
};
