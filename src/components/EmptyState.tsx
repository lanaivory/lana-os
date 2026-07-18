type Props = {
  title: string
  body: string
}

export function EmptyState({ title, body }: Props) {
  return (
    <div className="empty">
      <div className="empty__orb" aria-hidden />
      <p className="empty__title">{title}</p>
      <p className="empty__body">{body}</p>
    </div>
  )
}
