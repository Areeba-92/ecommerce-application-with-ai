"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCart } from "@/lib/store";
import { getProducts } from "@/lib/api";
import { getCurrentUserOnce, AUTH_CHANGED_EVENT } from "@/lib/insforge";
import type { Product } from "@/lib/data";
import {
  SearchIcon,
  CartIcon,
  UserIcon,
  MenuIcon,
  CloseIcon,
} from "@/components/Icons";

export default function Navbar() {
  const { count } = useCart();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    function checkAuth() {
      getCurrentUserOnce().then(({ data }) => {
        setSignedIn(Boolean(data.user));
      });
    }
    checkAuth();
    window.addEventListener(AUTH_CHANGED_EVENT, checkAuth);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, checkAuth);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setDrawerOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const id = setTimeout(() => {
      getProducts({ query, limit: 5 }).then((results) => {
        if (active) setSuggestions(results);
      });
    }, 200);
    return () => {
      active = false;
      clearTimeout(id);
    };
  }, [query]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    setSearchOpen(false);
  }

  function closeAll() {
    setSearchOpen(false);
    setDrawerOpen(false);
  }

  return (
    <>
      <div className="announcement">Free worldwide shipping over $75</div>
      <header className="navbar">
        <div className="container navbar__inner">
          <button
            type="button"
            className="navbar__hamburger navbar__icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <MenuIcon />
          </button>
          <Link href="/" className="navbar__logo">
            VELOUR
          </Link>
          <nav className="navbar__links">
            <Link href="/" className="navbar__link">
              Home
            </Link>
            <Link href="/women" className="navbar__link">
              Women
            </Link>
            <Link href="/men" className="navbar__link">
              Men
            </Link>
          </nav>
          <div className="navbar__actions">
            <button
              type="button"
              className="navbar__icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <SearchIcon />
            </button>
            <Link
              href={signedIn ? "/profile" : "/login"}
              className="navbar__icon-btn"
              aria-label={signedIn ? "Account (signed in)" : "Account"}
            >
              <UserIcon />
              {signedIn && <span className="navbar__signed-in-dot" />}
            </Link>
            <Link href="/cart" className="navbar__icon-btn" aria-label="Cart">
              <CartIcon />
              {count > 0 && <span className="navbar__badge">{count}</span>}
            </Link>
          </div>
        </div>
      </header>

      <div
        className={`drawer-overlay ${drawerOpen ? "is-open" : ""}`}
        onClick={closeAll}
      />
      <div className={`drawer ${drawerOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="navbar__icon-btn"
          onClick={closeAll}
          aria-label="Close menu"
        >
          <CloseIcon />
        </button>
        <nav style={{ marginTop: "2rem" }}>
          <Link href="/" className="drawer__link" onClick={closeAll}>
            Home
          </Link>
          <Link href="/women" className="drawer__link" onClick={closeAll}>
            Women
          </Link>
          <Link href="/men" className="drawer__link" onClick={closeAll}>
            Men
          </Link>
          <Link
            href={signedIn ? "/profile" : "/login"}
            className="drawer__link"
            onClick={closeAll}
          >
            Account
          </Link>
        </nav>
      </div>

      <div className={`search-overlay ${searchOpen ? "is-open" : ""}`}>
        <button
          type="button"
          className="search-overlay__close navbar__icon-btn"
          onClick={closeAll}
          aria-label="Close search"
        >
          <CloseIcon />
        </button>
        <form className="search-overlay__form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            className="search-overlay__input"
            placeholder="Search products…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" aria-label="Submit search">
            <SearchIcon />
          </button>
        </form>
        {suggestions.length > 0 && (
          <div className="search-overlay__suggestions">
            {suggestions.map((p) => (
              <Link
                key={p.id}
                href={`/product/${p.id}`}
                className="search-overlay__suggestion"
                onClick={closeAll}
              >
                <Image src={p.images[0]} alt="" width={48} height={60} />
                <span>{p.name}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
