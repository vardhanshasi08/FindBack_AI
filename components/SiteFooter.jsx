import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

export default function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
            FindBack AI is one central place where a lost item is reported, AI compares it with items others found, and a
            single Global Admin approves every claim before a secure handover closes the case.
          </p>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-foreground">Platform</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="transition-colors hover:text-foreground">
                Home
              </Link>
            </li>
            <li>
              <a href="#how-it-works" className="transition-colors hover:text-foreground">
                How It Works
              </a>
            </li>
            <li>
              <a href="#features" className="transition-colors hover:text-foreground">
                Features
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-display text-sm font-semibold text-foreground">Your account</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link to="/login" className="transition-colors hover:text-foreground">
                User Sign In
              </Link>
            </li>
            <li>
              <Link to="/register" className="transition-colors hover:text-foreground">
                Get Started
              </Link>
            </li>
            <li>
              <Link to="/forgot-password" className="transition-colors hover:text-foreground">
                Reset password
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border px-4 py-5 text-center text-xs text-muted-foreground sm:px-6">
        FindBack AI keeps ownership details private: they are never shown in listings, never sent to the AI and never
        shared with the finder.
      </div>
    </footer>
  );
}