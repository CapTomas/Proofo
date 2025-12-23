"use client";

import { useMemo } from "react";
import {
  Activity,
  Inbox,
  TrendingUp,
  Timer,
  CheckCircle2,
  XCircle,
  FileCheck,
  Clock
} from "lucide-react";
import { StatCard } from "@/components/dashboard/shared-components";
import { Deal } from "@/types";

interface DashboardStatsProps {
  deals: Deal[];
  userEmail?: string;
}

function getSignTimeMinutes(deal: Deal): number {
  if (!deal.confirmedAt || !deal.createdAt) return 0;
  const created = new Date(deal.createdAt).getTime();
  const confirmed = new Date(deal.confirmedAt).getTime();
  return (confirmed - created) / (1000 * 60);
}

function formatTimeValue(hours: number, minutes: number): string {
  if (hours > 0) return `~${hours}h`;
  if (minutes > 0) return `~${minutes}m`;
  return "N/A";
}

function formatTimeTrend(minutes: number): string | undefined {
  if (minutes === 0) return undefined;
  const absMinutes = Math.abs(minutes);
  if (absMinutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `${minutes > 0 ? '+' : ''}${hours}h`;
  }
  return `${minutes > 0 ? '+' : ''}${Math.round(minutes)}m`;
}

function formatCompletionRateTrend(trend: number): string | undefined {
  if (trend === 0) return undefined;
  return `${trend > 0 ? '+' : ''}${Math.round(trend)}%`;
}

export function DashboardStats({ deals, userEmail }: DashboardStatsProps) {
  const stats = useMemo(() => {
    const total = deals.length;
    const confirmed = deals.filter(d => d.status === "confirmed").length;
    const pending = deals.filter(d => d.status === "pending").length;
    const inbox = deals.filter(d => d.recipientEmail === userEmail && d.status === "pending").length;

    const signedDeals = deals.filter(d => d.status === "confirmed" && d.confirmedAt && d.createdAt);
    let avgTimeHours = 0;
    let avgTimeMinutes = 0;

    if (signedDeals.length > 0) {
      const totalMinutes = signedDeals.reduce((sum, deal) => sum + getSignTimeMinutes(deal), 0);
      const avgMinutes = totalMinutes / signedDeals.length;
      avgTimeHours = Math.floor(avgMinutes / 60);
      avgTimeMinutes = Math.round(avgMinutes % 60);
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentDeals = deals.filter(d => new Date(d.createdAt) >= sevenDaysAgo);
    const previousDeals = deals.filter(d => {
      const createdAt = new Date(d.createdAt);
      return createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;
    });

    const recentCompleted = recentDeals.filter(d => d.status === "confirmed").length;
    const previousCompleted = previousDeals.filter(d => d.status === "confirmed").length;

    const recentRate = recentDeals.length > 0 ? (recentCompleted / recentDeals.length) * 100 : 0;
    const previousRate = previousDeals.length > 0 ? (previousCompleted / previousDeals.length) * 100 : 0;
    const completionRateTrend = recentRate - previousRate;

    const sortedConfirmedDeals = signedDeals.toSorted((a, b) =>
      new Date(b.confirmedAt!).getTime() - new Date(a.confirmedAt!).getTime()
    );

    let avgTimeMinutesTrend = 0;
    if (sortedConfirmedDeals.length >= 2) {
      const recentFive = sortedConfirmedDeals.slice(0, 5);
      const previousFive = sortedConfirmedDeals.slice(5, 10);

      if (recentFive.length > 0) {
        const recentAvg = recentFive.reduce((sum, deal) => sum + getSignTimeMinutes(deal), 0) / recentFive.length;

        if (previousFive.length > 0) {
          const previousAvg = previousFive.reduce((sum, deal) => sum + getSignTimeMinutes(deal), 0) / previousFive.length;
          avgTimeMinutesTrend = recentAvg - previousAvg;
        }
      }
    }

    return {
      total,
      confirmed,
      pending,
      inbox,
      avgTimeHours,
      avgTimeMinutes,
      completionRateTrend,
      avgTimeMinutesTrend
    };
  }, [deals, userEmail]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard
        label="Action Required"
        value={stats.inbox}
        icon={Inbox}
        trend={stats.inbox > 0 ? "Attention" : "All Clear"}
        trendDirection={stats.inbox > 0 ? "down" : "neutral"}
        href="/dashboard/inbox"
        delay={0}
        colorClass="text-amber-500"
      />
      <StatCard
        label="Active Deals"
        value={stats.pending}
        icon={Activity}
        trend="Awaiting"
        trendDirection="neutral"
        href="/dashboard/agreements?status=pending"
        delay={0.1}
        colorClass="text-blue-500"
      />
      <StatCard
        label="Completion Rate"
        value={stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}%` : "0%"}
        icon={TrendingUp}
        trend={formatCompletionRateTrend(stats.completionRateTrend)}
        trendDirection={stats.completionRateTrend > 0 ? "up" : stats.completionRateTrend < 0 ? "down" : "neutral"}
        href="/dashboard/agreements"
        delay={0.2}
        colorClass="text-emerald-500"
      />
      <StatCard
        label="Avg. Sign Time"
        value={formatTimeValue(stats.avgTimeHours, stats.avgTimeMinutes)}
        icon={Timer}
        trend={formatTimeTrend(stats.avgTimeMinutesTrend)}
        trendDirection={stats.avgTimeMinutesTrend < 0 ? "up" : stats.avgTimeMinutesTrend > 0 ? "down" : "neutral"}
        href="/dashboard/agreements"
        delay={0.3}
        colorClass="text-purple-500"
      />
    </div>
  );
}
