"use client"

import { useEffect, useMemo, useState } from "react"
import { AppSidebar } from "./app-sidebar"
import styles from "./gradient-scrollbar.module.css"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, ScanLine, Shield, Sparkles, TrendingUp, LogOut, Recycle } from 'lucide-react'
import ItemForm from "./item-form"
import ItemTable, { type EwItem } from "./item-table"
import Scheduling, { type Pickup, type Vendor } from "./scheduling"
import ComplianceReport from "./compliance-report"
import Campaigns from "./campaigns"
import AnalyticsDashboard from "./analytics-dashboard"
import Vendors from "./vendors"
import { cn } from "@/lib/utils"
import { useAuth } from "./auth/auth-context"
import { useScrollAnimation, useStaggeredAnimation } from "@/hooks/use-scroll-animation"

const TAB_KEYS = ["items", "scheduling", "compliance", "campaigns", "analytics", "vendors"] as const
type TabKey = (typeof TAB_KEYS)[number]

function isTabKey(k: string): k is TabKey {
  return (TAB_KEYS as readonly string[]).includes(k)
}
function getHashKey(): TabKey | null {
  const h = (typeof window !== "undefined" && window.location.hash.replace("#", "")) || ""
  return isTabKey(h) ? (h as TabKey) : null
}

export default function EwastePortal() {
  const [items, setItems] = useState<EwItem[]>([])
  const [pickups, setPickups] = useState<Pickup[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([
    { id: "v-eco1", name: "EcoCycle Pvt Ltd", contact: "eco@cycle.com", certified: true },
    { id: "v-green2", name: "GreenLoop Recyclers", contact: "ops@greenloop.io", certified: true },
    { id: "v-scrap3", name: "City Scrap Co.", contact: "hello@cityscrap.in", certified: false },
  ])

  // Tabs synced with hash and with sidebar custom event
  const [tab, setTab] = useState<TabKey>(getHashKey() || "items")

  // Animation hooks
  const { ref: kpiRef, visibleItems: visibleKpis } = useStaggeredAnimation(4, 100)
  const { ref: headerRef, isInView: headerInView } = useScrollAnimation()

  useEffect(() => {
    // Listen for ew:tab-changed event to update tab state everywhere
    const onTabChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ activeTab: string }>).detail
      if (detail?.activeTab && isTabKey(detail.activeTab)) {
        setTab(detail.activeTab)
      }
    }
    window.addEventListener("ew:tab-changed", onTabChanged as any)
    // On mount, sync with hash if present
    const k = getHashKey()
    if (k) setTab(k)
    return () => {
      window.removeEventListener("ew:tab-changed", onTabChanged as any)
    }
  }, [])

  const { user, logout } = useAuth()

  // Persistence
  useEffect(() => {
    try {
      const raw = localStorage.getItem("ewaste:data")
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.items) setItems(parsed.items)
        if (parsed.pickups) setPickups(parsed.pickups)
        if (parsed.vendors) setVendors(parsed.vendors)
      }
    } catch {}
  }, [])
  useEffect(() => {
    localStorage.setItem("ewaste:data", JSON.stringify({ items, pickups, vendors }))
  }, [items, pickups, vendors])

  // Smart classify
  function autoClassify(item: Omit<EwItem, "id" | "status" | "createdAt" | "qrId">): EwItem["classification"] {
    const age = item.ageMonths
    const hazardous = item.category === "Battery" || /battery|lithium|acid/i.test(item.name)
    const reusable = !hazardous && age < 48 && (item.condition === "Good" || item.condition === "Fair") && !/broken|dead|faulty|burnt/i.test(item.name)
    return { type: hazardous ? "Hazardous" : reusable ? "Reusable" : "Recyclable", notes: undefined }
  }
  function addItem(data: Omit<EwItem, "id" | "status" | "createdAt" | "qrId">) {
    const id = `it-${Date.now()}`
    setItems((prev) => [{ ...data, id, createdAt: new Date().toISOString(), status: "Reported", qrId: id, classification: autoClassify(data) }, ...prev])
  }
  function updateItem(updated: EwItem) {
    setItems((p) => p.map((i) => (i.id === updated.id ? updated : i)))
  }
  function deleteItem(itemId: string) {
    setItems((prev) => prev.filter((item) => item.id !== itemId))
  }
  function schedulePickup(p: Pickup) {
    setPickups((prev) => [p, ...prev])
    if (p.itemIds?.length) setItems((prev) => prev.map((it) => (p.itemIds.includes(it.id) ? { ...it, status: "Scheduled", pickupId: p.id } : it)))
  }

  // Vendor management functions
  function addVendor(data: Omit<Vendor, 'id'>) {
    const id = `v-${Date.now()}`
    setVendors((prev) => [{ ...data, id }, ...prev])
  }
  function updateVendor(updated: Vendor) {
    setVendors((prev) => prev.map((v) => (v.id === updated.id ? updated : v)))
  }
  function removeVendor(vendorId: string) {
    setVendors((prev) => prev.filter((v) => v.id !== vendorId))
  }

  const analytics = useMemo(() => {
    const byMonth: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const byDept: Record<string, number> = {}
    let hazardousCount = 0
    items.forEach((i) => {
      const d = new Date(i.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      byMonth[key] = (byMonth[key] || 0) + 1
      byCategory[i.category] = (byCategory[i.category] || 0) + 1
      byDept[i.department] = (byDept[i.department] || 0) + 1
      if (i.classification.type === "Hazardous") hazardousCount++
    })
    const total = items.length
    const recoveryRate = total ? ((total - hazardousCount) / total) * 100 : 0
    
    // Calculate active campaigns based on actual activity
    const activeCampaigns = (() => {
      const currentDate = new Date()
      const currentMonth = currentDate.getMonth()
      const currentYear = currentDate.getFullYear()
      
      // Base campaigns that are always active
      let campaignCount = 1 // Green Challenge - always running
      
      // Add department competition if multiple departments are participating
      const activeDepts = Object.values(byDept).filter(count => count > 0).length
      if (activeDepts >= 2) campaignCount++ // Department competition
      
      // Add campus-wide challenge if 4+ departments are active
      if (activeDepts >= 4) campaignCount++ // Campus-wide challenge
      
      // Add awareness campaign if there's recent activity (items in last 30 days)
      const recentItems = items.filter(item => {
        const itemDate = new Date(item.createdAt)
        const daysDiff = (currentDate.getTime() - itemDate.getTime()) / (1000 * 60 * 60 * 24)
        return daysDiff <= 30
      })
      if (recentItems.length > 0) campaignCount++ // Awareness campaign
      
      // Add special drive if there are many items this month (lowered threshold)
      const thisMonthItems = items.filter(item => {
        const itemDate = new Date(item.createdAt)
        return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear
      })
      if (thisMonthItems.length >= 3) campaignCount++ // Special collection drive
      
      // Add sustainability initiative if all 6 departments participate
      if (activeDepts === 6) campaignCount++ // Full campus participation
      
      return campaignCount
    })()
    
    return { byMonth, byCategory, byDept, total, hazardousCount, recoveryRate, activeCampaigns }
  }, [items])

  return (
    <SidebarProvider>
      {/* 🔴 APP SIDEBAR - This is where the left sidebar component is rendered */}
      <AppSidebar />
      <SidebarInset>
        <header 
          ref={headerRef as any}
          className={`sticky top-0 z-10 overflow-hidden border-b border-transparent shadow-lg bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white transition-all duration-700 ease-out ${
            headerInView ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
          }`}
        >
          <div className="pointer-events-none absolute inset-0">
            {/* Enhanced background effects */}
            <div className="absolute -top-20 -left-24 h-56 w-56 rounded-full bg-white/15 blur-3xl animate-pulse" />
            <div className="absolute -bottom-24 -right-28 h-64 w-64 rounded-full bg-white/15 blur-3xl animate-pulse delay-1000" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-32 w-32 rounded-full bg-white/10 blur-2xl animate-pulse delay-500" />
            {/* Gradient overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/5" />
          </div>
          <div className="relative flex items-center gap-4 px-4 py-4 md:px-6 md:py-5">
            {/* 🔴 SIDEBAR TRIGGER - Enhanced hamburger menu button */}
            <SidebarTrigger className="text-white/90 hover:text-white hover:bg-white/10 transition-all duration-200 rounded-lg p-2 hidden md:inline-flex" />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Recycle className="h-7 w-7 md:h-8 md:w-8 opacity-90 drop-shadow-sm" aria-hidden />
                  <div className="absolute -inset-1 rounded-full bg-white/10 blur-sm -z-10" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-lg md:text-2xl font-bold tracking-tight drop-shadow-sm">
                    E‑Waste Management Portal
                  </h1>
                  <p className="text-sm md:text-base text-white/90 font-medium drop-shadow-sm">
                    Track, tag, schedule, and report e‑waste responsibly.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enhanced user info section */}
            <div className="hidden sm:flex flex-col items-end mr-4 min-w-0">
              <div className="flex items-center gap-2 text-white/80 text-xs mb-1">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span>Signed in as</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-semibold">
                  {(user?.name || user?.email || 'U')[0].toUpperCase()}
                </div>
                <span className="text-sm font-semibold truncate max-w-32 drop-shadow-sm">
                  {user?.name || user?.email}
                </span>
              </div>
            </div>
            
            {/* Enhanced logout button */}
            <Button 
              variant="secondary" 
              className="bg-white/20 border-white/30 text-white hover:bg-white/30 hover:border-white/40 transition-all duration-200 shadow-lg backdrop-blur-sm font-medium" 
              onClick={logout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
          
          {/* Subtle bottom border gradient */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </header>

        <main className={cn("flex-1", styles.gradientScroll)}>
          <section id="dashboard" className="p-4 md:p-6">
            <div 
              ref={kpiRef as any}
              className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
            >
              {[
                { title: "Total Items", value: analytics.total, icon: <ScanLine className="w-5 h-5" />, gradient: "from-emerald-500 via-teal-500 to-purple-600" },
                { title: "Hazardous", value: analytics.hazardousCount, icon: <Shield className="w-5 h-5" />, gradient: "from-rose-500 via-orange-500 to-amber-500" },
                { title: "Recovery Rate", value: `${analytics.recoveryRate.toFixed(1)}%`, icon: <TrendingUp className="w-5 h-5" />, gradient: "from-fuchsia-500 via-purple-500 to-violet-500" },
                { title: "Active Campaigns", value: analytics.activeCampaigns, icon: <Sparkles className="w-5 h-5" />, gradient: "from-lime-500 via-emerald-500 to-teal-500" }
              ].map((kpi, index) => (
                <div
                  key={kpi.title}
                  className={`transition-all duration-500 ease-out ${
                    visibleKpis.includes(index)
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-6 scale-95'
                  }`}
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <KpiCard title={kpi.title} value={kpi.value} icon={kpi.icon} gradient={kpi.gradient} />
                </div>
              ))}
            </div>
          </section>

          <Separator className="my-2" />

          <section id="features" className="p-4 md:p-6">
            <Tabs
              value={tab}
              onValueChange={(v) => {
                const key = v as TabKey
                // Always update hash and dispatch event, let listeners update state
                history.replaceState(null, "", `#${key}`)
                window.dispatchEvent(new CustomEvent("ew:tab-changed", { detail: { activeTab: key } }))
                // Scroll logic (optional, keep if needed)
                if (key === "scheduling" || key === "campaigns") {
                  setTimeout(() => {
                    const separator = document.querySelector('section#dashboard + .my-2') || 
                                    document.querySelector('.my-2') ||
                                    document.querySelector('[role="separator"]')
                    if (separator) {
                      const rect = separator.getBoundingClientRect()
                      const headerHeight = 95
                      const offsetTop = window.pageYOffset + rect.top - headerHeight
                      window.scrollTo({ top: offsetTop, behavior: "smooth" })
                    } else {
                      const featuresEl = document.getElementById("features")
                      if (featuresEl) {
                        const rect = featuresEl.getBoundingClientRect()
                        const headerHeight = 95
                        const offsetTop = window.pageYOffset + rect.top - headerHeight
                        window.scrollTo({ top: offsetTop, behavior: "smooth" })
                      }
                    }
                  }, 200)
                } else {
                  setTimeout(() => {
                    const separator = document.querySelector('section#dashboard + .my-2') || 
                                    document.querySelector('.my-2') ||
                                    document.querySelector('[role="separator"]')
                    if (separator) {
                      const rect = separator.getBoundingClientRect()
                      const headerHeight = 95
                      const offsetTop = window.pageYOffset + rect.top - headerHeight
                      window.scrollTo({ top: offsetTop, behavior: "smooth" })
                    } else {
                      const featuresEl = document.getElementById("features")
                      if (featuresEl) {
                        const rect = featuresEl.getBoundingClientRect()
                        const headerHeight = 95
                        const offsetTop = window.pageYOffset + rect.top - headerHeight
                        window.scrollTo({ top: offsetTop, behavior: "smooth" })
                      }
                    }
                  }, 200)
                }
              }}
              className="w-full"
            >
              <div className="w-full flex justify-between flex-col md:flex-row md:gap-4">
                {/* Tab bar box */}
                <div className="rounded-xl shadow-lg w-full md:w-[70%] max-w-5xl ml-0 flex flex-wrap justify-start gap-2 mb-4 md:mb-0 h-auto flex-row overflow-x-auto scrollbar-thin scrollbar-thumb-green-500">
                  <TabsList className="w-full flex-nowrap overflow-x-auto whitespace-nowrap justify-start gap-4 bg-white/90 rounded-2xl shadow-lg border border-gray-100 px-2 py-2 min-h-[64px] items-center scrollbar-thin scrollbar-thumb-green-500 flex-row">
                  <TabsTrigger 
                    value="items"
                    className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 transition-all duration-300 rounded-xl px-6 py-5 font-semibold text-base min-w-[120px] shadow-none"
                  >
                    <span className="relative z-10">📦 Items</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="scheduling"
                    className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 rounded-xl px-6 py-5 font-semibold text-base min-w-[120px] shadow-none"
                  >
                    <span className="relative z-10">📅 Scheduling</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="compliance"
                    className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gradient-to-r hover:from-amber-50 hover:to-orange-50 transition-all duration-300 rounded-xl px-6 py-5 font-semibold text-base min-w-[120px] shadow-none"
                  >
                    <span className="relative z-10">🛡️ Compliance</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="campaigns"
                    className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gradient-to-r hover:from-pink-50 hover:to-rose-50 transition-all duration-300 rounded-xl px-6 py-5 font-semibold text-base min-w-[120px] shadow-none"
                  >
                    <span className="relative z-10">🎯 Campaigns</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="analytics"
                    className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-violet-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gradient-to-r hover:from-purple-50 hover:to-violet-50 transition-all duration-300 rounded-xl px-6 py-5 font-semibold text-base min-w-[120px] shadow-none"
                  >
                    <span className="relative z-10">📊 Analytics</span>
                  </TabsTrigger>
                  <TabsTrigger 
                    value="vendors"
                    className="relative overflow-hidden data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-xl hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-300 rounded-xl px-6 py-5 font-semibold text-base min-w-[120px] shadow-none"
                  >
                    <span className="relative z-10">🏢 Vendors</span>
                  </TabsTrigger>
                </TabsList>
                </div>
                {/* Export button box */}
                <div className="flex items-center w-full md:w-auto max-md:w-full">
                  <Button
                    className="w-full md:w-auto bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0 shadow-md whitespace-nowrap sm:w-full"
                    onClick={() => {
                      const csv = [
                        ["id","name","department","category","ageMonths","condition","status","classification","createdAt"].join(","),
                        ...items.map((i) => [i.id, JSON.stringify(i.name), i.department, i.category, i.ageMonths, i.condition, i.status, i.classification.type, i.createdAt].join(",")),
                      ].join("\n")
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement("a")
                      a.href = url
                      a.download = "ewaste-items.csv"
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Items CSV
                  </Button>
                </div>
              </div>

              <TabsContent value="items" id="items" className="mt-4">
                <FeatureHeader
                  title="Centralized E-Waste, QR Tagging & Smart Sorting"
                  bullets={[
                    "Log items by department, category, age, and condition.",
                    "Auto‑generate QR codes for traceable tagging, movement, and status.",
                    "Automated classification (Recyclable, Reusable, Hazardous) with scheduling hints.",
                  ]}
                />
                <div className="grid gap-6 md:grid-cols-[420px_1fr]">
                  <ItemForm onAdd={addItem} />
                  <ItemTable items={items} vendors={vendors} onUpdate={updateItem} onScheduleQuick={schedulePickup} onDelete={deleteItem} />
                </div>
              </TabsContent>

              <TabsContent value="scheduling" id="scheduling" className="mt-4">
                <FeatureHeader
                  title="Smart Scheduling"
                  bullets={["Plan pickups with registered vendors.", "Filter by classification or department.", "Attach items to pickups and update their status."]}
                />
                <Scheduling items={items} vendors={vendors} pickups={pickups} onSchedule={schedulePickup} />
              </TabsContent>

              <TabsContent value="compliance" id="compliance" className="mt-4">
                <FeatureHeader
                  title="Compliance & Reporting"
                  bullets={["Auto‑generate summaries for CPCB and E‑Waste Rules compliance.", "Inventory traceability and audit logs.", "Export CSV for audits and filings."]}
                />
                <ComplianceReport items={items} pickups={pickups} vendors={vendors} />
              </TabsContent>

              <TabsContent value="campaigns" id="campaigns" className="mt-4">
                <FeatureHeader
                  title="User Engagement & Awareness"
                  bullets={["Run campaigns, challenges, and collection drives.", "Green scoreboard across departments.", "Student participation incentives."]}
                />
                <Campaigns items={items} />
              </TabsContent>

              <TabsContent value="analytics" id="analytics" className="mt-4">
                <FeatureHeader
                  title="Data Analytics Dashboard"
                  bullets={["Trends of reported e‑waste volume.", "Segment‑wise contributions and recovery rates.", "Environmental impact estimates from recycling."]}
                />
                <AnalyticsDashboard items={items} />
              </TabsContent>

              <TabsContent value="vendors" id="vendors" className="mt-4">
                <FeatureHeader
                  title="Vendor Management"
                  bullets={["Manage registered e-waste vendors and recyclers.", "Track vendor certifications and credentials.", "Maintain vendor contact information and services."]}
                />
                <Vendors 
                  vendors={vendors} 
                  onAddVendor={addVendor} 
                  onUpdateVendor={updateVendor} 
                  onRemoveVendor={removeVendor} 
                />
              </TabsContent>
            </Tabs>
          </section>

          <footer className="p-4 md:p-6 text-xs text-muted-foreground">Tip: Use the sidebar trigger (Cmd/Ctrl+B) to toggle navigation.</footer>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function KpiCard({ title, value, icon, gradient }: { title: string; value: number | string; icon: React.ReactNode; gradient: string }) {
  return (
    <Card className={cn("group relative overflow-hidden border-0 text-white shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1", `bg-gradient-to-br ${gradient}`)}>
      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-8 -right-8 h-16 w-16 rounded-full bg-white/10 blur-xl animate-pulse" />
        <div className="absolute -bottom-6 -left-6 h-12 w-12 rounded-full bg-white/15 blur-lg animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/5 blur-md animate-pulse delay-300" />
      </div>
      
      {/* Enhanced shadow overlay for hover effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-black/10 group-hover:from-white/15 group-hover:to-black/15 transition-all duration-300" />
      
      {/* Glass morphism border */}
      <div className="absolute inset-0 rounded-lg border border-white/20 group-hover:border-white/30 transition-colors duration-300" />
      
      <CardContent className="relative p-4 md:p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-base md:text-lg font-extrabold tracking-wider uppercase opacity-90 drop-shadow-sm text-shadow-sm group-hover:text-xl transition-all duration-300 ease-out">{title}</p>
          <div className="p-2 rounded-lg bg-white/15 backdrop-blur-sm group-hover:bg-white/20 transition-colors duration-300">
            <span aria-hidden className="opacity-90 drop-shadow-sm">{icon}</span>
          </div>
        </div>
        <p className="text-3xl md:text-4xl font-black tabular-nums drop-shadow-sm">{value}</p>
      </CardContent>
    </Card>
  )
}

function FeatureHeader({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-purple-600 p-4">
        <h2 className="text-white font-semibold">{title}</h2>
      </div>
      <div className="p-4">
        <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
          {bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
