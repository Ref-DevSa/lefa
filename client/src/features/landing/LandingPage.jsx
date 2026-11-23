import { Link } from 'react-router'
import { Card } from '../../components/ui/Card.jsx'
import { Logo } from '../../components/layout/Logo.jsx'
import { cn } from '../../lib/cn.js'

const STEPS = [
  { title: 'Record', text: 'Add every funeral, life and credit-life policy your family pays for.' },
  { title: 'Prepare', text: 'Keep IDs, policy schedules and bank letters ready for a claim.' },
  { title: 'Nominate', text: 'Choose a trusted person who can act for your family.' },
  { title: 'Unlock', text: 'When a death is verified, your nominee sees what they need.' },
  { title: 'Claim & track', text: 'A checklist and status for every policy, in one place.' },
]

// Sources: BUSINESS.md (ASISA H1 2025; FSCA / 2025 Budget).
const STATS = [
  { value: '17m', label: 'funeral policies in force in SA' },
  { value: 'R88bn', label: 'in unclaimed financial assets' },
  { value: '8.7m', label: 'risk policies lapsed in 2025' },
]

const PLANS = [
  { name: 'Free', price: 'R0', period: '', features: ['Up to 3 policies', '1 nominee', 'Document checklist'] },
  {
    name: 'Family Plus',
    price: 'R29',
    period: '/month',
    features: ['Unlimited policies', 'Up to 3 nominees', 'Premium reminders'],
    highlight: true,
  },
  { name: 'Brokers', price: 'R15', period: ' per client/month', features: ['Client dashboard', 'Verify deaths', 'Claims pipeline'] },
]

const buttonBase =
  'inline-flex min-h-11 items-center justify-center rounded-control px-5 font-semibold transition-colors'
const primaryBtn = cn(buttonBase, 'bg-primary text-white hover:bg-primary-hover')
const secondaryBtn = cn(buttonBase, 'border border-primary bg-surface text-primary hover:bg-cream')

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1 sm:gap-4">
            <a href="#how-it-works" className="hidden font-medium text-muted hover:text-ink sm:inline">
              How it works
            </a>
            <a href="#pricing" className="hidden font-medium text-muted hover:text-ink sm:inline">
              Pricing
            </a>
            <Link to="/login" className="px-2 font-medium text-primary">
              Log in
            </Link>
            <Link to="/signup" className={cn(primaryBtn, 'min-h-10 px-4')}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
          <div className="flex flex-col gap-5">
            <h1 className="text-4xl font-bold leading-tight text-ink md:text-5xl">
              Every policy. One vault. <span className="text-primary">Claim-ready</span> for the people you love.
            </h1>
            <p className="text-lg text-muted">
              South Africans hold 17 million funeral policies, yet billions go unclaimed. Lefa makes sure your cover
              reaches your family.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/signup" className={primaryBtn}>
                Start your free vault
              </Link>
              <Link to="/signup?as=broker" className={secondaryBtn}>
                I&apos;m a broker
              </Link>
            </div>
          </div>
          <HeroArt />
        </section>

        <section aria-label="Key numbers" className="bg-primary text-white">
          <dl className="mx-auto grid max-w-6xl gap-6 px-4 py-8 text-center sm:grid-cols-3">
            {STATS.map((s) => (
              <div key={s.value} className="flex flex-col-reverse">
                <dt className="text-white/80">{s.label}</dt>
                <dd className="text-3xl font-bold">{s.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="how-it-works" aria-labelledby="how-heading" className="mx-auto max-w-6xl scroll-mt-4 px-4 py-16">
          <h2 id="how-heading" className="mb-8 text-2xl font-semibold text-ink md:text-3xl">
            How it works
          </h2>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {STEPS.map((step, i) => (
              <Card as="li" key={step.title} className="flex flex-col gap-2">
                <span
                  aria-hidden="true"
                  className="grid size-9 place-items-center rounded-full bg-accent/15 font-bold text-accent"
                >
                  {i + 1}
                </span>
                <h3 className="font-semibold text-ink">{step.title}</h3>
                <p className="text-sm text-muted">{step.text}</p>
              </Card>
            ))}
          </ol>
        </section>

        <section id="pricing" aria-labelledby="pricing-heading" className="mx-auto max-w-6xl scroll-mt-4 px-4 pb-16">
          <h2 id="pricing-heading" className="mb-8 text-2xl font-semibold text-ink md:text-3xl">
            Pricing
          </h2>
          <ul className="grid gap-4 md:grid-cols-3">
            {PLANS.map((p) => (
              <Card as="li" key={p.name} className={cn('flex flex-col gap-4', p.highlight && 'border-2 border-primary')}>
                <div>
                  <h3 className="flex items-center gap-2 font-semibold text-ink">
                    {p.name}
                    {p.highlight && (
                      <span className="rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent">
                        Most popular
                      </span>
                    )}
                  </h3>
                  <p className="mt-1">
                    <span className="text-3xl font-bold text-ink">{p.price}</span>
                    <span className="text-muted">{p.period}</span>
                  </p>
                </div>
                <ul className="flex flex-col gap-2 text-sm text-ink">
                  {p.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="text-success">
                        ✓
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </ul>
        </section>

        <section aria-labelledby="trust-heading" className="border-t border-border bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-14">
            <h2 id="trust-heading" className="mb-6 text-2xl font-semibold text-ink">
              Private until it matters
            </h2>
            <ul className="grid gap-4 md:grid-cols-3">
              <li className="text-ink">
                <strong className="block">Your nominee sees nothing</strong>
                <span className="text-muted">until a death is verified by a broker or admin.</span>
              </li>
              <li className="text-ink">
                <strong className="block">POPIA-minded</strong>
                <span className="text-muted">We store only what a claim needs. No ID numbers as data fields.</span>
              </li>
              <li className="text-ink">
                <strong className="block">Private documents</strong>
                <span className="text-muted">Stored in private buckets and shared only through short-lived links.</span>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} Lefa. Built in South Africa.</span>
          <span>Lefa is not an insurer and does not pay out claims.</span>
        </div>
      </footer>
    </div>
  )
}

function HeroArt() {
  // Simple placeholder illustration until the Stitch hero image is exported.
  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-4 rounded-[32px] bg-accent/10" />
      <Card className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-ink">Family vault</span>
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-sm font-medium text-success">Claim-ready</span>
        </div>
        {[
          ['Funeral: family plan', 'R30 000'],
          ['Funeral: society', 'R15 000'],
          ['Life cover', 'R40 000'],
        ].map(([name, cover]) => (
          <div key={name} className="flex items-center justify-between rounded-control bg-cream px-3 py-2">
            <span className="text-sm text-ink">{name}</span>
            <span className="text-sm font-semibold text-primary">{cover}</span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted">Total cover</span>
          <span className="text-xl font-bold text-ink">R85 000</span>
        </div>
      </Card>
    </div>
  )
}
