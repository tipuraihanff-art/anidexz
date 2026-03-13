import React from 'react'
import { useApp } from '../AppContext.jsx'

export function ToastContainer() {
  const { toasts } = useApp()
  return (
    <div id="toast-wrap">
      {toasts.map(t => (
        <div key={t.id} className={'toast' + (t.out ? ' out' : '')}>{t.msg}</div>
      ))}
    </div>
  )
}

export function ProgressBar() {
  const { pbarW, pbarDone } = useApp()
  return (
    <div
      id="pbar"
      className={pbarDone ? 'done' : ''}
      style={{ width: pbarW + '%' }}
    />
  )
}

export function Loader() {
  return (
    <div id="loader">
      <div className="ld-logo"><b>ani</b>dexz</div>
      <div className="ld-track"><div className="ld-fill" /></div>
    </div>
  )
}
