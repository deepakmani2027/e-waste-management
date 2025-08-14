"use client"

import { useMemo } from "react"
import type { EwItem } from "./item-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartTooltip } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis, Cell, ResponsiveContainer } from "recharts"

// Base colors for known categories
const CATEGORY_BASE: Record<string,string> = {
  Computer: "#06b6d4",
  Projector: "#f97316",
  "Lab Equipment": "#84cc16",
  "Mobile Device": "#8b5cf6",
  Battery: "#ef4444",
  Accessory: "#22c55e",
  Other: "#64748b",
}
const PALETTE = ["#06b6d4","#f97316","#84cc16","#8b5cf6","#ef4444","#22c55e","#eab308","#10b981","#a855f7","#14b8a6","#f43f5e","#0ea5e9","#f59e0b","#34d399","#64748b","#7c3aed","#059669","#f87171","#38bdf8","#16a34a"]
function hashString(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function getCategoryColor(name:string){return CATEGORY_BASE[name] ?? PALETTE[hashString(name)%PALETTE.length]}

export default function AnalyticsDashboard({ items }: { items: EwItem[] }) {
  const currentYear = new Date().getFullYear()

  const data = useMemo(()=>{
    const byMonth:Record<string,number> = {}
  // per-month recycled counts removed (line chart removed)
    const deptContribution:Record<string,number> = {}
    const classificationCount:Record<string,number> = { Recyclable:0, Reusable:0, Hazardous:0 }
    const byCategory:Record<string,number> = {}
    // Approximate average weights (kg) per category (placeholder assumptions)
    const weightMap:Record<string,number> = { Computer:7, Projector:3, "Lab Equipment":10, "Mobile Device":0.2, Battery:0.05, Accessory:0.1, Other:1 }
    // Emission factor (kg CO2e avoided per kg correctly recycled) placeholder
    const emissionFactorPerKg = 1.8
    // Progress multipliers estimating fraction of impact realized at each stage
    const progressMultiplier:Record<string,number> = {
      Reported: 0,
      Scheduled: 0.15,
      Collected: 0.35,
      Sorted: 0.55,
      Processed: 0.75,
      Recycled: 1.0,
      Disposed: 0
    }
    let recycledCount=0
    let avoidedImpact=0
    let potentialImpact=0
    items.forEach(i=>{
      const d=new Date(i.createdAt)
      const key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      byMonth[key]=(byMonth[key]||0)+1
      byCategory[i.category]=(byCategory[i.category]||0)+1
      deptContribution[i.department]=(deptContribution[i.department]||0)+1
      classificationCount[i.classification.type]=(classificationCount[i.classification.type]||0)+1
      if(i.classification.type !== 'Hazardous' && i.status !== 'Disposed') {
        const weight = weightMap[i.category] ?? 1
        const fullImpact = weight * emissionFactorPerKg
        potentialImpact += fullImpact
        const mult = progressMultiplier[i.status] ?? 0
        avoidedImpact += fullImpact * mult
        if(i.status === 'Recycled') recycledCount++
      }
    })
    const now=new Date();const cy=now.getFullYear();const currMonth=now.getMonth()
    const monthArr = Array.from({length:12},(_,m)=>{
      const key=`${cy}-${String(m+1).padStart(2,'0')}`
      const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
      return {month:`${monthNames[m]} ${String(cy).slice(2)}`, fullMonth:key, total:byMonth[key]||0, isCurrentMonth:m===currMonth, isFutureMonth:m>currMonth}
    })
    const monthArrWithGrowth = monthArr.map((m,i)=>{const prev=i>0?monthArr[i-1]:null;const growth=prev && prev.total>0 ? ((m.total-prev.total)/prev.total*100):0;return {...m,growth}})
    const catArr = Object.entries(byCategory).map(([name,value])=>({name,value,color:getCategoryColor(name)}))
    const deptArr = Object.entries(deptContribution).map(([dept,count])=>({dept,count})).sort((a,b)=>b.count-a.count)
    const classArr = Object.entries(classificationCount).map(([name,value])=>({name,value}))
    const totalItems=items.length
    const activeMonths = monthArrWithGrowth.filter(m=>m.total>0).length || 1
    const avgPerMonth = totalItems/activeMonths
  return {monthArr:monthArrWithGrowth, catArr, deptArr, classArr, recycledCount, impactKgCO2:avoidedImpact, potentialKgCO2:potentialImpact, totalItems, avgPerMonth, recyclingRate: totalItems? (recycledCount/totalItems*100):0 }
  },[items])

  const peakMonth = data.monthArr.length? data.monthArr.reduce((a,b)=>a.total>b.total?a:b):null
  const currentMonthData = data.monthArr.find(m=>m.isCurrentMonth)
  const lastMonthData = currentMonthData ? data.monthArr[data.monthArr.indexOf(currentMonthData)-1] : undefined
  const currentGrowth = currentMonthData && lastMonthData && lastMonthData.total>0 ? ((currentMonthData.total-lastMonthData.total)/lastMonthData.total*100) : 0
  // recovery timeline removed

  return (
    <div className="space-y-10 mt-4">
      {/* Monthly Volume */}
      <Card>
        <CardHeader><CardTitle>Monthly Volume ({currentYear})</CardTitle></CardHeader>
        <CardContent>
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthArr} margin={{top:12,right:24,left:8,bottom:60}}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="month" angle={-45} textAnchor="end" interval={0} height={80} tickLine={false} axisLine={false} tick={{fontSize:12}} />
                <YAxis allowDecimals={false} width={40} tick={{fontSize:12}} />
                <ChartTooltip content={({active,payload,label})=>{if(active&&payload&&payload.length){const m=payload[0].payload;return <div className="rounded border bg-background p-3 shadow-md text-xs space-y-1"><div className="font-medium text-sm">{label}</div><div>Total: {m.total}</div>{m.growth!==0 && <div>Growth: <span className={m.growth>0?'text-green-600':'text-red-600'}>{m.growth>0?'+':''}{m.growth.toFixed(1)}%</span></div>}{m.isCurrentMonth && <div className="text-green-600">Current Month</div>}{m.isFutureMonth && <div className="text-muted-foreground">Future</div>}</div>} return null}} />
                <Bar dataKey="total" radius={[6,6,0,0]}> {data.monthArr.map(m=> <Cell key={m.fullMonth} fill={m.isCurrentMonth?'#10b981':m.isFutureMonth?'#e5e7eb':'#3b82f6'} />)} </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {[
              {title:'Peak Month', value: peakMonth? peakMonth.month : 'N/A', subtitle: peakMonth? `${peakMonth.total} items`:''},
              {title:'This Month', value:`${currentMonthData?.total||0} items`, subtitle: currentMonthData && lastMonthData? `${currentGrowth>0?'+':''}${currentGrowth.toFixed(1)}% vs last`:'No previous data'},
              {title:'Recycled', value:`${data.recycledCount} (${data.recyclingRate.toFixed(1)}%)`, subtitle:'Items recycled'},
              {title:'Avg Active Month', value:data.avgPerMonth.toFixed(1), subtitle:'Items / active month'}
            ].map(card=> (
              <div key={card.title} className="bg-muted/40 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{card.title}</div>
                <div className="font-semibold text-lg mt-1">{card.value}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{card.subtitle}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category & Impact Breakdown */}
      <Card>
        <CardHeader><CardTitle>Category & Impact Breakdown</CardTitle></CardHeader>
        <CardContent>
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="flex flex-col">
              {data.catArr.length === 0 ? <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">No category data</div> : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie dataKey="value" data={data.catArr} innerRadius={55} outerRadius={110} paddingAngle={2} cx="50%" cy="50%">
                        {data.catArr.map(slice=> <Cell key={slice.name} fill={slice.color} />)}
                      </Pie>
                      <ChartTooltip content={({active,payload})=>{if(active&&payload&&payload.length){const p=payload[0].payload;const pct=((p.value/data.totalItems)*100).toFixed(1);return <div className="rounded border bg-background p-3 shadow-md text-xs space-y-1"><div className="font-medium text-sm">{p.name}</div><div>Count: {p.value}</div><div>{pct}%</div></div>}return null}} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center">
              {data.catArr.length ? (
                <div className="space-y-4">
                  <div className="grid gap-2">
                    {data.catArr.map(c=>{const pct=((c.value/data.totalItems)*100).toFixed(1);return <div key={c.name} className="flex items-center justify-between p-2 bg-muted/30 rounded"><div className="flex items-center gap-2"><span className="inline-block w-3 h-3 rounded" style={{backgroundColor:c.color}} /> <span className="text-xs font-medium">{c.name}</span></div><div className="text-[11px] text-muted-foreground">{c.value} ({pct}%)</div></div>})}
                  </div>
                  <div className="text-[11px] text-muted-foreground border-t pt-3 leading-snug">
                    CO₂e avoided (est.): <span className="text-green-600 font-semibold">{data.impactKgCO2.toFixed(1)} kg</span><br/>
                    Potential (if fully recycled): {data.potentialKgCO2.toFixed(1)} kg<br/>
                    Tree yr eq*: {(data.impactKgCO2/21.77).toFixed(2)}
                  </div>
                </div>
              ) : <p className="text-xs text-muted-foreground">No data</p>}
            </div>
            <div className="flex flex-col justify-center">
              <h4 className="font-semibold mb-3 text-sm">Classification Breakdown</h4>
              {data.classArr.length ? (
                <div className="space-y-2">
                  {data.classArr.map(c=>{const pct=data.totalItems?(c.value/data.totalItems)*100:0;const barColor=c.name==='Hazardous'?'bg-rose-500':c.name==='Reusable'?'bg-emerald-500':'bg-amber-500';return <div key={c.name} className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">{c.name}</span><div className="flex items-center gap-2"><div className="w-32 h-2 bg-muted rounded overflow-hidden"><div className={`h-full ${barColor}`} style={{width:pct+'%'}} /></div><span className="text-[10px] font-medium">{c.value} ({pct.toFixed(1)}%)</span></div></div>})}
                </div>
              ) : <p className="text-xs text-muted-foreground">No data</p>}
              {/* Disclaimer removed per user request */}
            </div>
          </div>
        </CardContent>
      </Card>

  {/* Department Contributions card removed */}
    </div>
  )
}
