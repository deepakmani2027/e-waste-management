"use client"

import { useEffect, useRef, useState } from "react"
import { Calendar, Home, Truck, FileSpreadsheet, Gift, Factory, Boxes } from 'lucide-react'
import {
Sidebar,
SidebarContent,
SidebarGroup,
SidebarGroupContent,
SidebarGroupLabel,
SidebarHeader,
SidebarMenu,
SidebarMenuButton,
SidebarMenuItem,
SidebarFooter,
SidebarRail,
} from "@/components/ui/sidebar"
import styles from "./sidebar-effects.module.css"

// 🔴 SIDEBAR MENU ITEMS - This defines the left sidebar navigation items
type Item = { title: string; url: string; icon: React.ComponentType<any> }
const items: Item[] = [
{ title: "Dashboard", url: "#dashboard", icon: Home },       
{ title: "E-Waste Items", url: "#items", icon: Boxes },      
{ title: "Scheduling", url: "#scheduling", icon: Calendar },  
{ title: "Compliance", url: "#compliance", icon: FileSpreadsheet }, 
{ title: "Campaigns", url: "#campaigns", icon: Gift },       
{ title: "Analytics", url: "#analytics", icon: Truck },     
{ title: "Vendors", url: "#vendors", icon: Factory },       
]
const TAB_KEYS = new Set(["items", "scheduling", "compliance", "campaigns", "analytics", "vendors"])

// 🔴 MAIN SIDEBAR COMPONENT - This renders the actual left sidebar UI
export function AppSidebar() {
  const [active, setActive] = useState<string>(items[0].url)
  const [pressed, setPressed] = useState<string | null>(null)
  const obsRef = useRef<IntersectionObserver | null>(null)

  // Scroll spy
  useEffect(() => {
    // Listen for ew:tab-changed event to update sidebar state everywhere
    const onTabChanged = (e: Event) => {
      const detail = (e as CustomEvent<{ activeTab: string }>).detail
      if (detail?.activeTab) {
        setActive(`#${detail.activeTab}`)
      }
    }
    window.addEventListener("ew:tab-changed", onTabChanged as any)
    // On mount, sync with hash if present
    if (location.hash) setActive(location.hash)
    return () => {
      window.removeEventListener("ew:tab-changed", onTabChanged as any)
    }
  }, [])

  function go(item: Item) {
    const key = item.url.replace("#", "")
    // Always update hash and dispatch ew:tab-changed event
    history.replaceState(null, "", item.url)
    window.dispatchEvent(new CustomEvent("ew:tab-changed", { detail: { activeTab: key } }))
    // Ripple feedback
    setPressed(item.url)
    window.setTimeout(() => setPressed(null), 450)
  }

  return (
    // 🔴 SIDEBAR CONTAINER - Main sidebar wrapper with collapsible functionality
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="mt-6">
        <SidebarGroup>
          <SidebarGroupLabel className="text-base font-bold">E‑Waste Portal</SidebarGroupLabel>
          <SidebarGroupContent className="mt-4">
            {/* 🔴 SIDEBAR MENU - This creates the vertical list of navigation items */}
            <SidebarMenu className="gap-4">
              {items.map((item, index) => {
                const Icon = item.icon
                const isActive = active === item.url
                const isPressed = pressed === item.url
                return (
                  <SidebarMenuItem key={item.title} className={`relative ${index > 0 ? 'mt-3' : ''}`}>
                    {/* 🔴 ACTIVE INDICATOR - Green accent strip on the left */}
                    <span
                      aria-hidden
                      className={`pointer-events-none absolute left-0 top-0 bottom-0 h-full w-1 rounded-r-full transition-all group-data-[collapsible=icon]:hidden ${
                        isActive ? "bg-gradient-to-b from-emerald-500 via-teal-500 to-purple-600 opacity-100" : "opacity-0"
                      }`}
                    />
                    <SidebarMenuButton asChild tooltip={item.title}>
                      {/* 🔴 NAVIGATION BUTTON - Individual sidebar menu item */}
                      <button
                        type="button"
                        onClick={() => go(item)}
                        className={[
                          // Base - increased padding for better spacing
                          "relative w-full rounded-r-xl rounded-l-sm transition-all duration-200 py-8 px-4 mr-2",
                          // Remove hovers
                          "hover:!bg-transparent hover:!text-foreground dark:hover:!text-foreground",
                          // Active tint
                          isActive ? "text-emerald-700 dark:text-emerald-300" : "text-foreground",
                          // Slight left shift in icon-only mode
                          "group-data-[collapsible=icon]:-translate-x-0.5 md:group-data-[collapsible=icon]:-translate-x-1",
                          // Optional glow on active (kept)
                          isActive ? styles.glowActive : "",
                        ].join(" ")}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={item.title}
                      >
                        {isPressed && <span className={styles.ripple} />}
                        {/* Icon container without hover scale and without ring overlay */}
                        <span
                          className={[
                            "relative grid place-items-center rounded-lg transition-transform duration-200",
                            // Slight left shift in icon-only mode
                            "group-data-[collapsible=icon]:-translate-x-0.5 md:group-data-[collapsible=icon]:-translate-x-1",
                            // Keep only active scale
                            isActive ? "scale-110" : "",
                          ].join(" ")}
                        >
                          <Icon
                            className={[
                              "h-6 w-6",
                              isActive ? "text-emerald-600 dark:text-emerald-300" : "text-foreground",
                            ].join(" ")}
                          />
                        </span>
                        <span className="hidden md:inline ml-4 text-base font-medium">{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarHeader>
      <SidebarContent />
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
