import React from 'react';
import { Link } from 'react-router-dom';
import Logo from '@/components/Logo';

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link to="/" aria-label="FindBack AI home">
          <Logo size="sm" />
        </Link>
        <nav className="ml-auto hidden items-center gap-1 md:flex">
          <a
            href="#how-it-works"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            How It Works
          </a>
          <a
            href="#features"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            Features
          </a>
          <Link
            to="/login"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            User Sign In
          </Link>
        </nav>