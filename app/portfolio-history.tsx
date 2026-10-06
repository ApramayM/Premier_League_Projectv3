'use client';
import {useState} from 'react';
import {LineChart,Line,XAxis,YAxis,Tooltip,CartesianGrid} from 'recharts';
import {ChartContainer} from '@/components/ui/chart';
import {Tabs,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {credit,UNIT} from '@/lib/market';
import type {HistoryPoint} from '@/lib/history';
export default function PortfolioHistory({points,signedIn,playerName}:{points:HistoryPoint[];signedIn:boolean;playerName?:string|null}){
 const [days,setDays]=useState('30');
 const latest=points.at(-1);const cutoff=(latest?.at??Date.now())-Number(days)*86400000;
 const shown=points.filter(p=>p.at>=cutoff).map(p=>({...p,value:p.value/UNIT,cash:p.cash/UNIT}));
 return <section className="portfolio-history" aria-label="Portfolio value history"><div className="history-top"><div><div className="eyebrow">{playerName?`${playerName}'s portfolio`:'YOUR PROGRESS'}</div><h2>Value over time</h2></div><Tabs value={days} onValueChange={setDays}><TabsList>{['7','30','90'].map(d=><TabsTrigger key={d} value={d}>{d}D</TabsTrigger>)}</TabsList></Tabs></div>
 {!signedIn?<p>Sign in to save your portfolio and track it across visits.</p>:<><div className="history-legend"><span>● Portfolio value</span><span>● Available cash</span></div>{shown.length<2?<div className="history-start"><strong>{latest?credit(latest.value):'History starts now'}</strong><p>Your first saved value is the starting point. More points appear as your portfolio updates over time.</p></div>:<ChartContainer className="h-[230px] w-full" config={{value:{label:"Portfolio value",color:"#146b4b"},cash:{label:"Available cash",color:"#798a9b"}}}><LineChart data={shown} margin={{top:12,right:15,left:5,bottom:5}} accessibilityLayer><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="at" type="number" domain={['dataMin','dataMax']} tickFormatter={v=>new Date(v).toLocaleDateString([],{month:'short',day:'numeric'})} minTickGap={55}/><YAxis tickFormatter={v=>`$${v}`} width={65}/><Tooltip labelFormatter={v=>new Date(Number(v)).toLocaleString()} formatter={(v,name)=>[credit(Number(v)*UNIT),name==='value'?'Portfolio value':'Available cash']}/><Line type="linear" dataKey="value" stroke="#146b4b" strokeWidth={3} dot={false}/><Line type="linear" dataKey="cash" stroke="#798a9b" strokeDasharray="4 4" dot={false}/></LineChart></ChartContainer>}<p className="source-note">Saved during daily settlement checks and whenever you visit or trade. History begins with your first recorded value; earlier performance is not reconstructed. Holdings use the latest available prices.</p></>}
 </section>;
}
