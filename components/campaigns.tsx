"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { EwItem } from "./item-table"
import { Gift, Medal, Cpu, FlaskConical, BookOpen, Building2, Home, Users } from 'lucide-react'
import { useScrollAnimation, useStaggeredAnimation } from "@/hooks/use-scroll-animation"

type Dept = EwItem["department"]

// Department icons mapping
const DEPT_ICONS: Record<Dept, any> = {
  Engineering: Cpu,
  Sciences: FlaskConical,
  Humanities: BookOpen,
  Administration: Building2,
  Hostel: Home,
  Other: Users,
}

export default function Campaigns({ items }: { items: EwItem[] }) {
  const [joined, setJoined] = useState(false)

  // Animation hooks
  const { ref: challengeRef, isInView: challengeInView } = useScrollAnimation()
  const { ref: scoreboardRef, isInView: scoreboardInView } = useScrollAnimation()
  const { ref: itemsRef, visibleItems } = useStaggeredAnimation(6, 150) // Up to 6 departments

  // Calculate real user points based on actual items
  const userStats = useMemo(() => {
    const totalItems = items.length
    const points = totalItems * 10 // 10 points per item reported
    const recentItems = items.filter(item => {
      const itemDate = new Date(item.createdAt)
      const daysDiff = (Date.now() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysDiff <= 7 // Items in last 7 days
    })
    const weeklyBonus = recentItems.length * 5 // 5 bonus points for recent activity
    
    return {
      totalPoints: points + weeklyBonus,
      itemsReported: totalItems,
      weeklyItems: recentItems.length,
      progress: Math.min((points + weeklyBonus) / 100 * 100, 100)
    }
  }, [items])

  const scoreboard = useMemo(() => {
    const byDept: Record<Dept, { count: number; points: number }> = {
      Engineering: { count: 0, points: 0 },
      Sciences: { count: 0, points: 0 },
      Humanities: { count: 0, points: 0 },
      Administration: { count: 0, points: 0 },
      Hostel: { count: 0, points: 0 },
      Other: { count: 0, points: 0 },
    }
    
    items.forEach((i) => {
      byDept[i.department].count++
      // Points by classification only
      if (i.classification.type === "Hazardous") {
        byDept[i.department].points += 20
      } else if (i.classification.type === "Reusable") {
        byDept[i.department].points += 15
      } else if (i.classification.type === "Recyclable") {
        byDept[i.department].points += 10
      }
    })
    
    const entries = Object.entries(byDept) as [Dept, { count: number; points: number }][]
    return entries
      .filter(([, stats]) => stats.count > 0) // Only show departments with items
      .sort((a, b) => b[1].points - a[1].points) // Sort by points
  }, [items])

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] mt-4">
      <Card 
        ref={challengeRef as any}
        className={`transition-all duration-700 ease-out ${
          challengeInView 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
      >
        <CardHeader>
          <CardTitle>Green Challenge — Month</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Report e‑waste from your lab or department. Earn points for each verified item and climb the green scoreboard!
          </p>
          <div className="rounded-xl p-4 text-white bg-gradient-to-r from-lime-500 via-emerald-500 to-teal-500">
            <p className="text-sm opacity-90">Current Reward Pool</p>
            <p className="text-2xl font-semibold">Campus Tree Drive</p>
            <p className="text-sm opacity-90">Top 3 departments win a sponsored sapling plantation drive.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Your Points</p>
              <p className="text-2xl font-semibold mt-1">{userStats.totalPoints}</p>
              <Progress value={userStats.progress} className="mt-2" />
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">Goal</p>
              <p className="text-2xl font-semibold mt-1">100</p>
              <p className="text-xs text-muted-foreground mt-1">Earn by reporting real items</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              className="relative overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 hover:from-emerald-600 hover:via-teal-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5"
              onClick={() => setJoined(true)}
              disabled={joined}
            >
              <div className="relative z-10 flex items-center">
                <Gift className="w-4 h-4 mr-2" />
                {joined ? "✅ Joined!" : "🚀 Join Challenge"}
              </div>
              {!joined && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              )}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // This is now just for demo - real points come from item reporting
                alert(`You have ${userStats.totalPoints} real points from ${userStats.itemsReported} items! Report more items to earn points.`)
              }}
              className="relative overflow-hidden border-2 border-gradient-to-r from-emerald-400 to-purple-400 hover:border-emerald-500 bg-white/90 backdrop-blur-sm hover:bg-gradient-to-r hover:from-emerald-50 hover:to-purple-50 transition-all duration-300 transform hover:scale-105 hover:-translate-y-0.5 shadow-md hover:shadow-lg"
              style={{
                background: 'linear-gradient(white, white) padding-box, linear-gradient(90deg, #10b981, #8b5cf6) border-box',
                border: '2px solid transparent'
              }}
            >
              <span className="relative z-10 bg-gradient-to-r from-emerald-600 to-purple-600 bg-clip-text text-transparent font-semibold">
                📊 View Real Stats
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card 
        ref={scoreboardRef as any}
        className={`transition-all duration-700 ease-out ${
          scoreboardInView 
            ? 'opacity-100 translate-y-0' 
            : 'opacity-0 translate-y-8'
        }`}
        style={{ transitionDelay: '200ms' }}
      >
        <CardHeader>
          <CardTitle>Department Scoreboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3" ref={itemsRef as any}>
          {scoreboard.map(([dept, stats], idx) => {
            const DeptIcon = DEPT_ICONS[dept]
            return (
              <div
                key={dept}
                ref={(el) => {
                  if (el && visibleItems.includes(idx)) {
                    el.style.animationDelay = `${idx * 100}ms`
                    el.classList.add('animate-in', 'slide-in-from-left-2', 'fade-in-50')
                  }
                }}
                className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-blue-50/50 to-purple-50/50 hover:from-blue-100/70 hover:to-purple-100/70 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {idx < 3 ? (
                      <Medal className="w-4 h-4 text-amber-500" />
                    ) : (
                      <span className="w-4 h-4" aria-hidden />
                    )}
                    <DeptIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{dept}</p>
                    <p className="text-xs text-muted-foreground">{stats.count} items</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold text-emerald-600">{stats.points} pts</p>
                  <p className="text-xs text-muted-foreground">#{idx + 1}</p>
                </div>
              </div>
            )
          })}
          {scoreboard.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
