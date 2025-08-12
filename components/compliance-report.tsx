"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { EwItem } from "./item-table"
import type { Pickup, Vendor } from "./scheduling"
import { Download } from 'lucide-react'

export default function ComplianceReport({
  items,
  pickups,
  vendors,
}: {
  items: EwItem[]
  pickups: Pickup[]
  vendors: Vendor[]
}) {
  const summary = useMemo(() => {
    const total = items.length
    const byClass: Record<string, number> = {}
    const byCategory: Record<string, number> = {}
    const byDept: Record<string, number> = {}
    const withPickup = items.filter((i) => i.pickupId).length
    const hazardous = items.filter((i) => i.classification.type === "Hazardous").length
    items.forEach((i) => {
      byClass[i.classification.type] = (byClass[i.classification.type] || 0) + 1
      byCategory[i.category] = (byCategory[i.category] || 0) + 1
      byDept[i.department] = (byDept[i.department] || 0) + 1
    })
    const certifiedPickups = pickups.filter((p) => vendors.find((v) => v.id === p.vendorId && v.certified))
    return {
      total, byClass, byCategory, byDept, withPickup, hazardous,
      certifiedPickupCount: certifiedPickups.length,
    }
  }, [items, pickups, vendors])

  function exportComplianceCSV() {
    const rows: string[] = []
    rows.push("Section,Key,Value")
    rows.push(`Summary,Total Items,${summary.total}`)
    rows.push(`Summary,Items with Pickups,${summary.withPickup}`)
    rows.push(`Summary,Certified Pickups,${summary.certifiedPickupCount}`)
    rows.push(`Summary,Hazardous Items,${summary.hazardous}`)
    rows.push("")
    rows.push("By Class,Type,Count")
    Object.entries(summary.byClass).forEach(([k, v]) => rows.push(`Class,${k},${v}`))
    rows.push("")
    rows.push("By Category,Type,Count")
    Object.entries(summary.byCategory).forEach(([k, v]) => rows.push(`Category,${k},${v}`))
    rows.push("")
    rows.push("By Department,Dept,Count")
    Object.entries(summary.byDept).forEach(([k, v]) => rows.push(`Department,${k},${v}`))
    const csv = rows.join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "compliance-report.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1fr] mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Total Items" value={summary.total} />
            <Stat label="Hazardous" value={summary.hazardous} badgeClass="bg-rose-100 text-rose-700" />
            <Stat label="With Pickups" value={summary.withPickup} />
            <Stat label="Certified Pickups" value={summary.certifiedPickupCount} />
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium mb-1">CPCB & E‑Waste Rules Traceability</p>
            <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
              <li>Item-level tagging with QR and unique IDs</li>
              <li>Recorded movement: Reported → Scheduled → Collected → Recycled/Disposed</li>
              <li>Vendor certification status tracked</li>
              <li>Department-wise inventory distribution and hazardous segregation</li>
            </ul>
          </div>
          <Button
            className="bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0"
            onClick={exportComplianceCSV}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <p className="text-sm font-medium mb-2">By Classification</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.byClass).map(([k, v]) => (
                <Badge key={k} variant="outline">{k}: {v}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">By Category</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.byCategory).map(([k, v]) => (
                <Badge key={k} variant="secondary">{k}: {v}</Badge>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">By Department</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(summary.byDept).map(([k, v]) => (
                <Badge key={k} variant="outline">{k}: {v}</Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, badgeClass }: { label: string; value: number; badgeClass?: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
      <Badge className={badgeClass || ""} variant="outline" aria-hidden />
    </div>
  )
}
