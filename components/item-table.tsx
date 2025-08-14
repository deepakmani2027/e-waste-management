"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ArrowDownAZ, ArrowUpAZ, CalendarDays, Download, QrCode, Trash2 } from 'lucide-react'
import QRCode from "qrcode";

// QR Code contains clean, compatible text format
// Optimized for mobile scanning with:
// - Simple text layout without special characters
// - All essential product information
// - High error correction for reliable scanning
// - Compatible with any QR scanner app

export type EwStatus = "Reported" | "Scheduled" | "Collected" | "Sorted" | "Processed" | "Recycled" | "Disposed";
export type EwItem = {
  id: string
  qrId: string
  name: string
  department: "Engineering" | "Sciences" | "Humanities" | "Administration" | "Hostel" | "Other"
  category: "Computer" | "Projector" | "Lab Equipment" | "Mobile Device" | "Battery" | "Accessory" | "Other"
  ageMonths: number
  condition: "Good" | "Fair" | "Poor" | "Dead"
  notes?: string
  status: "Reported" | "Scheduled" | "Collected" | "Sorted" | "Processed" | "Recycled" | "Disposed"
  createdAt: string
  classification: { type: "Recyclable" | "Reusable" | "Hazardous"; notes?: string }
  pickupId?: string
  auditTrail?: Array<{ date: string; user: string; stage: string; status: string }>
  disposalHistory?: Array<{ date: string; user: string; action: string }>
  disposedAt?: string
  disposedBy?: string
}

export type Vendor = { id: string; name: string; contact: string; certified: boolean }
export type Pickup = {
  id: string
  date: string
  vendorId: string
  itemIds: string[]
  notes?: string
}

export default function ItemTable({
  items,
  vendors,
  onUpdate,
  onScheduleQuick,
  onDelete,
}: {
  items: EwItem[]
  vendors: Vendor[]
  onUpdate: (item: EwItem) => void
  onScheduleQuick: (pickup: Pickup) => void
  onDelete: (id: string) => void
}) {
  // Helper to update status and audit trail (simulate QR scan)
  const scanAndUpdateStatus = (item: EwItem, newStatus: EwStatus, stage: string) => {
    const user = typeof window !== 'undefined' && localStorage.getItem('user') || 'system';
    const now = new Date().toISOString();
    const updated: EwItem = {
      ...item,
      status: newStatus,
      auditTrail: [
        ...(item.auditTrail || []),
        { date: now, user, stage, status: newStatus }
      ]
    };
    onUpdate(updated);
  };
  const [qrcodeDataURL, setQrcodeDataURL] = useState<string | null>(null)
  const [currentItem, setCurrentItem] = useState<EwItem | null>(null)
  const [search, setSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [deptFilter, setDeptFilter] = useState<string>("All")
  const [classFilter, setClassFilter] = useState<string>("All")

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return items
      .filter((i) => (deptFilter === "All" ? true : i.department === deptFilter))
      .filter((i) => (classFilter === "All" ? true : i.classification.type === classFilter))
      .filter(
        (i) =>
          i.name.toLowerCase().includes(s) ||
          i.category.toLowerCase().includes(s) ||
          i.department.toLowerCase().includes(s) ||
          i.id.toLowerCase().includes(s)
      )
      .sort((a, b) => (sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)))
  }, [items, search, sortAsc, deptFilter, classFilter])

  async function showQR(item: EwItem) {
    // Store the current item for display in the dialog
    setCurrentItem(item)
    
    // Create clean, compatible text format that displays properly when scanned
    // Using simple format that works best with QR scanners
    const qrText = `ITEM: ${item.name}
      ID: ${item.id}
      DEPT: ${item.department}
      CATEGORY: ${item.category}
      CONDITION: ${item.condition}
      CLASS: ${item.classification.type}
      STATUS: ${item.status}
      AGE: ${item.ageMonths}m
      CREATED: ${new Date(item.createdAt).toLocaleDateString()}${item.notes ? `
      NOTES: ${item.notes}` : ''}

E-Waste Portal - ${new Date().toLocaleDateString()}`
    
    const url = await QRCode.toDataURL(qrText, { 
      // Generate higher resolution for crisp display/download, we will display smaller
      width: 512, 
      margin: 2,
      errorCorrectionLevel: 'H',
      type: 'image/png',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    setQrcodeDataURL(url)
  }

  function quickSchedule(item: EwItem) {
    const vendor = vendors.find((v) => v.certified) || vendors[0]
    const pickup: Pickup = {
      id: `p-${Date.now()}`,
      date: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      vendorId: vendor?.id || "",
      itemIds: [item.id],
      notes: "Auto-scheduled from item table",
    }
    onScheduleQuick(pickup)
  }

  function handleDispose(item: EwItem) {
    const user = typeof window !== 'undefined' && localStorage.getItem('user') || 'admin';
    if (item.status === 'Disposed') return;
    if (confirm(`Mark item "${item.name}" as disposed?`)) {
      const now = new Date().toISOString();
      const updated: EwItem = {
        ...item,
        status: 'Disposed',
        disposedAt: now,
        disposedBy: user,
        disposalHistory: [
          ...(item.disposalHistory || []),
          { date: now, user, action: 'Disposed' }
        ]
      };
      onUpdate(updated);
    }
  }

  return (
    <Card className="overflow-hidden mt-4">
      <CardHeader className="pb-2">
        <CardTitle>Inventory</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-12 gap-4 items-end">
          {/* Search (narrower on md/xl) */}
          <div className="col-span-12 md:col-span-5 xl:col-span-4 min-w-0">
            <Label htmlFor="search" className="mb-1 block">Search</Label>
            <Input
              id="search"
              placeholder="Search item, category, department, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10"
            />
          </div>

          {/* Sort button */}
          <div className="col-span-6 sm:col-span-2 md:col-span-1 flex flex-row items-center gap-2 md:justify-center md:items-stretch">
            <Label className="mb-1 block md:sr-only">Sort</Label>
            <Button
              variant="outline"
              onClick={() => setSortAsc((s) => !s)}
              aria-label="Toggle sort"
              title="Toggle sort A–Z/Z–A"
              className="h-10 w-full sm:w-10 shrink-0"
            >
              {sortAsc ? <ArrowDownAZ className="w-4 h-4" /> : <ArrowUpAZ className="w-4 h-4" />}
            </Button>
          </div>

          {/* Filter Dept (wider) */}
          <div className="col-span-12 sm:col-span-5 md:col-span-3">
            <Label className="mb-1 block">Filter Dept</Label>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {["All","Engineering","Sciences","Humanities","Administration","Hostel","Other"].map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filter Class (wider) */}
          <div className="col-span-12 sm:col-span-5 md:col-span-3">
            <Label className="mb-1 block">Filter Class</Label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {["All","Recyclable","Reusable","Hazardous"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[56px]">QR</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Dept</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="icon" variant="ghost" onClick={() => showQR(it)}>
                          <QrCode className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="w-[520px] max-w-[92vw] max-h-[70vh] sm:max-h-[85vh] overflow-y-auto p-6 mt-10 rounded-xl shadow-2xl border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 flex flex-col z-50">
                        <DialogHeader>
                          <DialogTitle>QR Code & Product Details</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-5 min-h-0 flex-1 overflow-y-auto pr-1"> {/* scrollable content area */}
                          {/* QR Code Section */}
                          <div className="flex flex-col items-center justify-center gap-3 self-center">
                            <Image
                              src={qrcodeDataURL || "/placeholder.svg?height=220&width=220&query=qr%20placeholder"}
                              alt="QR Code"
                              width={220}
                              height={220}
                              sizes="220px"
                              className="rounded-md border w-[220px] h-[220px] object-contain"
                            />
                            <Button
                              className="w-full"
                              onClick={() => {
                                if (!qrcodeDataURL || !currentItem) return
                                const a = document.createElement("a")
                                a.href = qrcodeDataURL
                                a.download = `${currentItem.id}-qr.png`
                                a.click()
                              }}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download QR Code
                            </Button>
                          </div>
                          
                          {/* Product Details Section */}
                          {currentItem && (
                            <div className="border-t pt-4 flex flex-col flex-1">
                              <h4 className="font-semibold mb-3 text-center">Product Information</h4>
                              <div className="grid gap-3 text-sm flex-1">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">ID:</span>
                                  <span className="font-semibold">{currentItem.id}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Name:</span>
                                  <span className="font-medium">{currentItem.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Category:</span>
                                  <span>{currentItem.category}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Department:</span>
                                  <span>{currentItem.department}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Condition:</span>
                                  <span>{currentItem.condition}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Classification:</span>
                                  <Badge
                                    className={
                                      currentItem.classification.type === "Hazardous"
                                        ? "bg-rose-100 text-rose-700"
                                        : currentItem.classification.type === "Reusable"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-amber-100 text-amber-700"
                                    }
                                    variant="outline"
                                  >
                                    {currentItem.classification.type}
                                  </Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Status:</span>
                                  <span>{currentItem.status}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Age:</span>
                                  <span>{currentItem.ageMonths} months</span>
                                </div>
                                {currentItem.notes && (
                                  <div className="flex flex-col gap-1">
                                    <span className="text-muted-foreground">Notes:</span>
                                    <span className="text-xs bg-muted p-2 rounded">{currentItem.notes}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Created:</span>
                                  <span className="text-xs">{new Date(currentItem.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              {/* Audit Trail Section */}
                              {currentItem.auditTrail && currentItem.auditTrail.length > 0 && (
                                <div className="mt-auto pt-4">
                                  <span className="text-muted-foreground font-semibold block mb-1">Audit Trail:</span>
                                  <ul className="text-xs space-y-1 bg-gray-50 rounded p-2 border border-gray-200 max-h-40 overflow-y-auto">
                                    {currentItem.auditTrail.map((h, idx) => (
                                      <li key={idx} className="ml-2 flex items-center gap-2">
                                        <span className="font-mono text-gray-700">{h.date ? new Date(h.date).toLocaleString() : ''}</span>
                                        <span className="font-semibold text-blue-700">{h.user}</span>
                                        <span className="text-gray-500">{h.stage} → {h.status}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {/* Disposal History Section (if any) */}
                              {currentItem.disposalHistory && currentItem.disposalHistory.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-muted-foreground font-semibold block mb-1">Disposal History:</span>
                                  <ul className="text-xs space-y-1 bg-gray-50 rounded p-2 border border-gray-200">
                                    {currentItem.disposalHistory.map((h, idx) => (
                                      <li key={idx} className="ml-2 flex items-center gap-2">
                                        <span className="font-mono text-gray-700">{h.date ? new Date(h.date).toLocaleString() : ''}</span>
                                        <span className="font-semibold text-blue-700">{h.user}</span>
                                        <span className="text-gray-500">{h.action}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                          {/* QR Scan/Status Update Buttons */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button size="sm" onClick={() => scanAndUpdateStatus(currentItem, "Collected", "Pickup")}>Mark as Collected</Button>
                            <Button size="sm" onClick={() => scanAndUpdateStatus(currentItem, "Sorted", "Sorting")}>Mark as Sorted</Button>
                            <Button size="sm" onClick={() => scanAndUpdateStatus(currentItem, "Processed", "Processing")}>Mark as Processed</Button>
                          </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell>{it.department}</TableCell>
                  <TableCell>{it.category}</TableCell>
                  <TableCell>{it.ageMonths}m</TableCell>
                  <TableCell>{it.condition}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        it.classification.type === "Hazardous"
                          ? "bg-rose-100 text-rose-700"
                          : it.classification.type === "Reusable"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                      }
                      variant="outline"
                    >
                      {it.classification.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{it.status}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex gap-4">
                        <Button variant="secondary" size="sm" onClick={() => quickSchedule(it)}>
                          <CalendarDays className="w-4 h-4 mr-1" />
                          Schedule
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={it.status === 'Disposed'}
                          onClick={() => handleDispose(it)}
                        >
                          {/* @ts-ignore */}
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4l2-3 2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                          {it.status === 'Disposed' ? 'Disposed' : 'Dispose'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (confirm("Delete this item permanently?")) {
                              onDelete(it.id)
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                      {it.disposedAt && (
                        <div className="text-xs text-right mt-1">
                          <div>
                            <span className="font-semibold">Disposed At:</span> {it.disposedAt ? new Date(it.disposedAt).toLocaleString() : ''}
                          </div>
                          <div>
                            <span className="font-semibold">Disposed By:</span> {it.disposedBy || ''}
                          </div>
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground">
                    No items. Add some from the form on the left.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

