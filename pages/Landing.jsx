import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, PackageSearch, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import PublicNav from '@/components/PublicNav';
import SiteFooter from '@/components/SiteFooter';
import HeroMatchIllustration from '@/components/HeroMatchIllustration';
import HowItWorks from '@/components/HowItWorks';
import FeatureSections from '@/components/FeatureSections';

export default function Landing() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <PublicNav />

      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] fb-grid-fade" aria-hidden="true" />
        <div className="fb-glow -left-24 top-10 h-72 w-72 bg-violet-700/40" aria-hidden="true" />
        <div className="fb-glow right-0 top-40 h-64 w-64 bg-indigo-600/30" aria-hidden="true" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="fb-rise">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
              <Sparkles className="h-3.5 w-3.5" /> AI-assisted digital lost &amp; found
            </span>
            <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Lost Something? <span className="fb-gradient-text">Let AI Help You Find It.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
              A smarter way to reconnect lost belongings with the people who matter. AI-powered matching, trusted claim
              review, and secure item handover in one place.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/report/lost"
                className="inline-flex items-center gap-2 rounded-xl fb-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-transform hover:scale-[1.02]"
              >
                <PackageSearch className="h-4 w-4" /> Report Lost Item
              </Link>
              <Link
                to="/report/found"
                className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-violet-500/40"
              >
                <Package className="h-4 w-4" /> Report Found Item
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> One Global Admin approves every claim
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ArrowRight className="h-3.5 w-3.5 text-violet-300" /> Registration is free for users who lost or found
                an item
              </span>
            </div>
          </div>

          <HeroMatchIllustration />
        </div>
      </section>

      <FeatureSections />
      <HowItWorks />

      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Report it once. Let the platform carry it to the handover.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Create your free user account, submit the report, and follow every status change from your dashboard. If you
            found something, your report is what makes the owner's recovery possible.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 rounded-xl fb-gradient px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-900/30 transition-transform hover:scale-[1.02]"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 text-sm font-semibold text-foreground transition-colors hover:border-violet-500/40"
            >
              User Sign In
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}