"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { EwItem } from "./item-table"
import { ClipboardList } from 'lucide-react'
import { useScrollAnimation, useStaggeredAnimation } from "@/hooks/use-scroll-animation"

export type Vendor = { id: string; name: string; contact: string; certified: boolean }
export type Pickup = {
  id: string
  date: string // YYYY-MM-DD
  vendorId: string
  itemIds: string[]
  notes?: string
}

export default function Scheduling({
  items,
  vendors,
  pickups,
  onSchedule,
}: {
  items: EwItem[]
  vendors: Vendor[]
  pickups: Pickup[]
  onSchedule: (pickup: Pickup) => void
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [vendorId, setVendorId] = useState<string>(vendors[0]?.id || "")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [notes, setNotes] = useState("")

  // Animation hooks
  const { ref: createRef, isInView: createInView } = useScrollAnimation()
  const { ref: pickupsRef, visibleItems: visiblePickups } = useStaggeredAnimation(pickups.length, 100)

  const selectable = useMemo(() => items.filter((i) => i.status === "Reported"), [items])

  function toggle(id: string) {
    setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function selectAll() {
    if (selectedIds.length === selectable.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(selectable.map(item => item.id))
    }
  }

  function schedule() {
    if (!vendorId || selectedIds.length === 0) return
    const pickup: Pickup = {
      id: `p-${Date.now()}`,
      date,
      vendorId,
      itemIds: selectedIds,
      notes,
    }
    onSchedule(pickup)
    setSelectedIds([])
    setNotes("")
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr] mt-4">
      <Card 
        ref={createRef as any}
        className={`transition-all duration-700 ease-out ${
          createInView 
            ? 'opacity-100 translate-y-0 scale-100' 
            : 'opacity-0 translate-y-8 scale-95'
        }`}
      >
        <CardHeader>
          <CardTitle>Create Pickup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Pickup Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Vendor</Label>
              <Select value={vendorId} onValueChange={setVendorId}>
                <SelectTrigger><SelectValue placeholder="Select vendor" /></SelectTrigger>
                <SelectContent>
                  {vendors.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name} {v.certified ? "• Certified" : "• Unverified"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional instructions" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Select Items to Schedule ({selectedIds.length} selected)</Label>
              {selectable.length > 0 && (
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm"
                  onClick={selectAll}
                >
                  {selectedIds.length === selectable.length ? "Deselect All" : "Select All"}
                </Button>
              )}
            </div>
            <div className="rounded-md border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input 
                        type="checkbox" 
                        checked={selectable.length > 0 && selectedIds.length === selectable.length}
                        onChange={selectAll}
                        className="cursor-pointer"
                        aria-label="Select all items"
                      />
                    </TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Dept</TableHead>
                    <TableHead>Class</TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {selectable.map((i) => (
                  <TableRow key={i.id} className="cursor-pointer" onClick={() => toggle(i.id)}>
                    <TableCell>
                      <input aria-label={`Select ${i.name}`} type="checkbox" checked={selectedIds.includes(i.id)} readOnly />
                    </TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.department}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{i.classification.type}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {selectable.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No reported items.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0"
            onClick={schedule}
            disabled={selectedIds.length === 0 || !vendorId}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Schedule Pickup ({selectedIds.length})
          </Button>
        </CardContent>
      </Card>

      <Card 
        ref={pickupsRef as any}
        className={`transition-all duration-700 ease-out ${
          pickups.length > 0 ? '' : ''
        }`}
        style={{ transitionDelay: '300ms' }}
      >
        <CardHeader>
          <CardTitle>Upcoming Pickups</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {pickups.length === 0 && (
            <p className="text-sm text-muted-foreground">No pickups scheduled yet.</p>
          )}
          <div className="grid gap-3">
            {pickups.map((p, index) => {
              const vendor = vendors.find((v) => v.id === p.vendorId)
              return (
                <div 
                  key={p.id} 
                  className={`rounded-lg border p-3 transition-all duration-500 ease-out ${
                    visiblePickups.includes(index)
                      ? 'opacity-100 translate-y-0 scale-100'
                      : 'opacity-0 translate-y-4 scale-95'
                  }`}
                  style={{ transitionDelay: `${index * 100 + 400}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{vendor?.name || "Unknown Vendor"}</div>
                    <Badge>{p.date}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{vendor?.contact}</p>
                  <p className="text-sm mt-1">
                    Items: <span className="font-mono">{p.itemIds.length}</span>
                  </p>
                  {p.notes && <p className="text-sm mt-1">{p.notes}</p>}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
