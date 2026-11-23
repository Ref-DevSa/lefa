/** Error banner for a failed submit (e.g. "Incorrect email or password"). */
export function FormAlert({ children }) {
  return (
    <div role="alert" className="rounded-control border border-danger/30 bg-danger/5 px-3 py-2.5 text-sm text-danger">
      {children}
    </div>
  )
}
