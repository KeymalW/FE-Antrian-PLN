export function QServeLogo({ className = 'h-10 w-auto' }: { className?: string }) {
  return (
    <img
      src="/assets/Logo QServe.png"
      alt="QServe"
      className={`object-contain ${className}`}
    />
  )
}