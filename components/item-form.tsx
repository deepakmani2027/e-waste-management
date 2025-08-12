"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { PlusCircle } from 'lucide-react'
import { useScrollAnimation } from "@/hooks/use-scroll-animation"

export type Department = "Engineering" | "Sciences" | "Humanities" | "Administration" | "Hostel" | "Other"
export type Category =
  | "Computer"
  | "Projector"
  | "Lab Equipment"
  | "Mobile Device"
  | "Battery"
  | "Accessory"
  | "Other"

export default function ItemForm({ onAdd }: { onAdd: (data: any) => void }) {
  const [name, setName] = useState("")
  const [department, setDepartment] = useState<Department>("Engineering")
  const [category, setCategory] = useState<Category>("Computer")
  const [ageMonths, setAgeMonths] = useState(12)
  const [condition, setCondition] = useState<"Good" | "Fair" | "Poor" | "Dead">("Fair")
  const [notes, setNotes] = useState("")

  const { ref, isInView } = useScrollAnimation()

  function submit() {
    if (!name.trim()) return
    onAdd({
      name,
      department,
      category,
      ageMonths: Number(ageMonths),
      condition,
      notes,
    })
    setName("")
    setAgeMonths(12)
    setCondition("Fair")
    setNotes("")
  }

  return (
    <Card 
      ref={ref as any}
      className={`mt-4 transition-all duration-700 ease-out ${
        isInView 
          ? 'opacity-100 translate-y-0 scale-100' 
          : 'opacity-0 translate-y-8 scale-95'
      }`}
    >
      <CardHeader>
        <CardTitle>Add E‑Waste Item</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <Label htmlFor="name">Item name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. HP EliteBook 840" />
        </div>
        <div className="grid gap-3">
          <Label>Department</Label>
          <Select value={department} onValueChange={(v: Department) => setDepartment(v)}>
            <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
            <SelectContent>
              {["Engineering","Sciences","Humanities","Administration","Hostel","Other"].map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v: Category) => setCategory(v)}>
            <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {["Computer","Projector","Lab Equipment","Mobile Device","Battery","Accessory","Other"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-3">
            <Label htmlFor="age">Age (months)</Label>
            <Input id="age" type="number" min={0} value={ageMonths} onChange={(e) => setAgeMonths(Number(e.target.value))} />
          </div>
          <div className="grid gap-3">
            <Label>Condition</Label>
            <Select value={condition} onValueChange={(v: any) => setCondition(v)}>
              <SelectTrigger><SelectValue placeholder="Condition" /></SelectTrigger>
              <SelectContent>
                {["Good","Fair","Poor","Dead"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Model, serial, hazards, etc." />
        </div>
        <Button className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-purple-600 text-white border-0" onClick={submit}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </CardContent>
    </Card>
  )
}
