import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import HeroSlideshow from "@/components/HeroSlideshow";

const HERO_VIDEO_PATH = path.join(process.cwd(), "public", "videos", "hero.mp4");
const HERO_POSTER_PATH = path.join(process.cwd(), "public", "images", "hero-poster.jpg");

const SLIDESHOW_IMAGES = [
  "https://images.unsplash.com/photo-1750190321916-fdad2bbf6931?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1780776489912-aa89b69b8c59?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1752794673269-dc356838c5fd?auto=format&fit=crop&w=1600&q=80",
];

// Video hero is a server component: if a transcoded hero video (see
// scripts/import-listings.mjs README + top-level project brief) exists at
// public/videos/hero.mp4, play it; otherwise fall back to the client-side
// Unsplash crossfade slideshow. A hero video is in place (transcoded to H.264,
// audio stripped, faststart) so the video branch is what renders — the
// slideshow branch stays as a fallback for any future build without one.
export default function Hero() {
  const hasVideo = fs.existsSync(HERO_VIDEO_PATH);
  const hasPoster = fs.existsSync(HERO_POSTER_PATH);

  return (
    <section className="hero">
      <div className="hero__media">
        {hasVideo ? (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={hasPoster ? "/images/hero-poster.jpg" : undefined}
          >
            <source src="/videos/hero.mp4" type="video/mp4" />
          </video>
        ) : (
          <HeroSlideshow images={SLIDESHOW_IMAGES} />
        )}
      </div>
      <div className="hero__overlay" />
      <div className="hero__content">
        <span className="hero__eyebrow">Autumn / Winter Collection</span>
        <h1 className="hero__title">Considered Style, Quietly Confident</h1>
        <p className="hero__subtitle">
          Premium essentials for men &amp; women, cut for the way you actually live.
        </p>
        <div className="hero__ctas">
          <Link href="/women" className="btn btn--light">
            Shop Women
          </Link>
          <Link href="/men" className="btn btn--light">
            Shop Men
          </Link>
        </div>
      </div>
      <div className="hero__scroll">
        <span>Scroll</span>
        <span className="hero__scroll-icon">&darr;</span>
      </div>
    </section>
  );
}
