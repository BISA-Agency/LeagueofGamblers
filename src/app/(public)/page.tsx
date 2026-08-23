import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import { BetSlipDemo } from "@/components/landing/bet-slip-demo";
import { HeroVisual } from "@/components/landing/hero-visual";
import { PotCalculator } from "@/components/landing/pot-calculator";
import { ScreenShowcase } from "@/components/landing/screen-showcase";
import { Button } from "@/components/ui/button";
import {
  sportsbook,
  fairPlay,
  faq,
  finalCta,
  footer,
  gamification,
  hero,
  howItWorks,
  potSection,
  showcase,
  stats,
} from "@/content/landing";

export const metadata: Metadata = {
  title: "League of Gamblers — de maandelijkse challenge voor je vriendengroep",
  description: hero.subtitle,
  openGraph: {
    title: "League of Gamblers",
    description: hero.subtitle,
    type: "website",
  },
};

// Nothing here reads per-request state, so the whole page is static.
export const dynamic = "force-static";

function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-accent-brand">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-4 text-muted-foreground text-pretty">{subtitle}</p>}
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <span className="text-lg font-semibold tracking-tight">
            League of <span className="text-accent-brand">Gamblers</span>
          </span>
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/rules"
              className="hidden h-11 items-center px-3 text-sm text-muted-foreground hover:text-foreground sm:flex"
            >
              Spelregels
            </Link>
            <Button asChild size="sm" variant="ghost" className="h-11">
              <Link href="/login">Inloggen</Link>
            </Button>
            <Button asChild size="sm" className="h-11">
              <Link href="/login?mode=register">Account maken</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate px-4 pb-20 pt-14 sm:pt-20">
          {/* Brand glow, purely decorative. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-32 -z-10 h-[36rem] bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,color-mix(in_oklch,var(--accent-brand)_22%,transparent),transparent_70%)]"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 md:grid-cols-2">
            <div className="text-center md:text-left">
              <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-accent-brand" />
                {hero.eyebrow}
              </p>
              <h1 className="whitespace-pre-line text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {hero.title}
              </h1>
              <p className="mx-auto mt-5 max-w-md text-lg text-muted-foreground text-pretty md:mx-0">
                {hero.subtitle}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row md:justify-start">
                <Button asChild size="lg" className="h-12 text-base">
                  <Link href="/login?mode=register">
                    {hero.primaryCta}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 text-base">
                  <Link href="/login">{hero.secondaryCta}</Link>
                </Button>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{hero.note}</p>
            </div>

            <div className="relative pb-12 md:pb-0">
              <HeroVisual />
            </div>
          </div>

          <dl className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-5 text-center"
              >
                <dt className="text-3xl font-semibold tabular-nums text-accent-brand">
                  {stat.value}
                </dt>
                <dd className="mt-1 text-sm font-medium">{stat.label}</dd>
                <dd className="text-xs text-muted-foreground">{stat.hint}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Hoe het werkt */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionHeading title={howItWorks.title} subtitle={howItWorks.subtitle} />
            <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {howItWorks.steps.map((step, i) => (
                <li key={step.title} className="rounded-xl border border-border bg-card p-5">
                  <span className="flex size-8 items-center justify-center rounded-full bg-accent-brand text-sm font-semibold text-accent-brand-foreground">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Speelbare demo */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHeading
              eyebrow="Probeer het nu"
              title="Bouw je eerste combi"
              subtitle="Dit is het echte sportsbook-gevoel, hier op de pagina. Tik quoteringen aan en zie je mogelijke winst meebewegen."
            />
            <div className="mt-12">
              <BetSlipDemo />
            </div>
          </div>
        </section>

        {/* App-tour */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHeading title={showcase.title} subtitle={showcase.subtitle} />
            <div className="mt-12">
              <ScreenShowcase />
            </div>
          </div>
        </section>

        {/* Sportsbook */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHeading title={sportsbook.title} subtitle={sportsbook.subtitle} />
            <div className="mt-12 grid gap-4 sm:grid-cols-2">
              {sportsbook.points.map((point) => (
                <div key={point.title} className="rounded-xl border border-border bg-card p-6">
                  <h3 className="flex items-start gap-2.5 text-base font-semibold">
                    <Check className="mt-0.5 size-4 shrink-0 text-accent-brand" />
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">{point.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pot */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-3xl">
            <SectionHeading title={potSection.title} subtitle={potSection.subtitle} />
            <div className="mt-12">
              <PotCalculator />
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-brand" />
              <div>
                <p className="text-sm font-medium">{potSection.disclaimerTitle}</p>
                <p className="mt-1 text-sm text-muted-foreground text-pretty">
                  {potSection.disclaimer}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Gamification */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHeading title={gamification.title} subtitle={gamification.subtitle} />
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {gamification.items.map((item) => (
                <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground text-pretty">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Fair play */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <SectionHeading title={fairPlay.title} subtitle={fairPlay.subtitle} />
            <div className="mt-12 grid gap-x-10 gap-y-8 md:grid-cols-2">
              {fairPlay.points.map((point) => (
                <div key={point.title} className="flex gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-accent-brand" />
                  <div>
                    <h3 className="font-semibold">{point.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground text-pretty">{point.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ — native <details>, so it costs no JavaScript. */}
        <section className="border-t border-border/60 px-4 py-20">
          <div className="mx-auto max-w-2xl">
            <SectionHeading title={faq.title} />
            <div className="mt-10 divide-y divide-border rounded-xl border border-border">
              {faq.items.map((item) => (
                <details key={item.q} className="group px-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium marker:hidden">
                    {item.q}
                    <span
                      aria-hidden
                      className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45"
                    >
                      +
                    </span>
                  </summary>
                  <p className="pb-4 text-sm text-muted-foreground text-pretty">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Slot-CTA */}
        <section className="relative isolate border-t border-border/60 px-4 py-24">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-96 bg-[radial-gradient(ellipse_50%_60%_at_50%_100%,color-mix(in_oklch,var(--accent-brand)_18%,transparent),transparent_70%)]"
          />
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {finalCta.title}
            </h2>
            <p className="mt-4 text-muted-foreground text-pretty">{finalCta.body}</p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 text-base">
                <Link href="/login?mode=register">
                  {finalCta.primary}
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 text-base">
                <Link href="/rules">{finalCta.secondary}</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 px-4 py-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <p className="font-semibold tracking-tight">
              League of <span className="text-accent-brand">Gamblers</span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground text-pretty">{footer.tagline}</p>
          </div>
          <nav className="flex gap-6 text-sm">
            <Link href="/rules" className="text-muted-foreground hover:text-foreground">
              Spelregels
            </Link>
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Inloggen
            </Link>
          </nav>
        </div>
        <p className="mx-auto mt-8 max-w-5xl text-xs text-muted-foreground">{footer.responsible}</p>
      </footer>
    </div>
  );
}
