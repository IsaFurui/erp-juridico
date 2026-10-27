import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/ui/Icon'
import { processDetailPath } from '../../lib/constants'
import type { Notification, NotificationList } from '../../lib/api'
import { notificationsApi } from '../../lib/api'
import './NotificationBell.css'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return `há ${d} d`
}

function NotificationBell() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationList | null>(null)

  const load = useCallback(() => {
    notificationsApi
      .list()
      .then(setData)
      .catch(() => {
        /* silencioso: o sino só fica sem badge */
      })
  }, [])

  // Carrega ao montar e vai atualizando o contador de tempos em tempos.
  useEffect(() => {
    load()
    const id = window.setInterval(load, 60000)
    return () => window.clearInterval(id)
  }, [load])

  const unread = data?.unreadCount ?? 0
  const items = data?.items ?? []

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next) load()
  }

  const handleClick = async (n: Notification) => {
    setOpen(false)
    if (!n.read) {
      try {
        await notificationsApi.markRead(n.id)
        load()
      } catch {
        /* ignora */
      }
    }
    if (n.processId) navigate(processDetailPath(n.processId))
  }

  const handleMarkAll = async () => {
    try {
      await notificationsApi.markAllRead()
      load()
    } catch {
      /* ignora */
    }
  }

  return (
    <div className="notif">
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={handleOpen}
        aria-label="Notificações"
      >
        <Icon name="bell" size={18} />
        {unread > 0 && (
          <span className="notif-badge">{unread > 9 ? '9+' : unread}</span>
        )}
      </button>

      {open && (
        <>
          <div className="notif-backdrop" onClick={() => setOpen(false)} />
          <div className="notif-pop ui-pop">
            <div className="notif-head">
              <span className="notif-title">Notificações</span>
              {unread > 0 && (
                <button
                  type="button"
                  className="notif-markall"
                  onClick={handleMarkAll}
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="notif-empty">Nenhuma notificação.</p>
            ) : (
              <ul className="notif-list">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`notif-item${n.read ? '' : ' is-unread'}`}
                      onClick={() => handleClick(n)}
                    >
                      <span className="notif-item-msg">{n.message}</span>
                      <span className="notif-item-time">
                        {timeAgo(n.createdAt)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default NotificationBell
