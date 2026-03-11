import React, { useState, useEffect } from 'react'
import { useApp } from '../AppContext.jsx'
import { alQuery, Q_LIST, buildVars } from '../api.js'
import { Card, Spin, Empty, Skels } from '../components/Shared.jsx'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const SEASONS = ['WINTER','SPRING','SUMMER','FALL']
const SEASON_MAP = [0,0,0,1,1,1,2,2,2,3,3,3]

export default function Schedule() {
  const { pbStart, pbDone } = useApp()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const now = new Date()
  const dow = now.getDay()
  const mo = now.getMonth()
  const curSeason = SEASONS[SEASON_MAP[mo]]
  const curYear = now.getFullYear()

  useEffect(() => {
    pbStart()
    alQuery(Q_LIST(), buildVars({ sort: 'TRENDING_DESC', status: 'RELEASING', season: curSeason, seasonYear: curYear, page: 1 }))
      .then(d => {
        setItems((d?.Page?.media) || [])
        setLoading(false)
        pbDone()
      })
      .catch(() => { setLoading(false); pbDone() })
  }, [])

  return (
    <div className="sec" style={{ paddingTop: '22px' }}>
      <div className="sec-hdr">
        <h2 className="sec-title">
          Airing This Season — {DAYS[dow]}, {curSeason.charAt(0) + curSeason.slice(1).toLowerCase()} {curYear}
        </h2>
      </div>
      {loading ? (
        <div className="grid"><Skels /></div>
      ) : !items.length ? (
        <div className="grid"><Empty title="No schedule data" body="Nothing found for this season." /></div>
      ) : (
        <div className="grid">
          {items.map((m, i) => <Card key={m.id} m={m} delay={i * 34} />)}
        </div>
      )}
    </div>
  )
}
