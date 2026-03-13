import React from 'react'
import { useApp } from '../AppContext.jsx'
import { getWL } from '../storage.js'
import { Card, Empty } from '../components/Shared.jsx'

export default function MyList() {
  const { go } = useApp()
  const wl = getWL()

  return (
    <div className="sec" style={{ paddingTop: '22px' }}>
      <div className="sec-hdr">
        <h2 className="sec-title">My List</h2>
        <span style={{ fontSize: '11px', color: 'var(--dim)' }}>{wl.length} titles</span>
      </div>
      {!wl.length ? (
        <div className="grid">
          <Empty
            title="Your list is empty"
            body={'Add anime by clicking the heart icon on any card.'}
          />
        </div>
      ) : (
        <div className="grid">
          {wl.map((item, i) => {
            const fakeM = {
              id: item.id,
              title: { english: item.title, romaji: item.titleAlt || item.title },
              coverImage: { large: item.poster || '', medium: item.poster || '' },
              averageScore: item.score,
              format: (item.type || '').replace(/ /g, '_')
            }
            return <Card key={item.id} m={fakeM} delay={i * 34} />
          })}
        </div>
      )}
    </div>
  )
}
