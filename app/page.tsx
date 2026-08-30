import Link from "next/link";
import Image from "next/image";
import Hero from "@/components/Hero";
import ProductCard from "@/components/ProductCard";
import ScrollReveal from "@/components/ScrollReveal";
import NewsletterForm from "@/components/NewsletterForm";
import { getFeatured, getNewArrivals, getTrending } from "@/lib/api";

export default async function HomePage() {
  const [featured, newArrivals, trending] = await Promise.all([
    getFeatured(),
    getNewArrivals(),
    getTrending(),
  ]);

  return (
    <>
      <Hero />

      <section className="section section--tight">
        <div className="container">
          <div className="categories">
            <Link href="/women" className="category-card">
              <Image
                src="https://images.unsplash.com/photo-1750190321916-fdad2bbf6931?auto=format&fit=crop&w=1200&q=80"
                alt="Shop Women"
                fill
                sizes="(max-width: 720px) 100vw, 50vw"
              />
              <div className="category-card__overlay" />
              <div className="category-card__label">
                <h3>Women</h3>
                <span>Shop the edit</span>
              </div>
            </Link>
            <Link href="/men" className="category-card">
              <Image
                src="https://images.unsplash.com/photo-1780776489912-aa89b69b8c59?auto=format&fit=crop&w=1200&q=80"
                alt="Shop Men"
                fill
                sizes="(max-width: 720px) 100vw, 50vw"
              />
              <div className="category-card__overlay" />
              <div className="category-card__label">
                <h3>Men</h3>
                <span>Shop the edit</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {featured.length > 0 && (
        <section className="section section--tight">
          <div className="container">
            <div className="section__head">
              <div>
                <span className="eyebrow">Curated</span>
                <h2 className="section__title">Featured</h2>
              </div>
              <Link href="/women" className="section__link">
                View All
              </Link>
            </div>
            <div className="grid grid--4">
              {featured.map((p, i) => (
                <ScrollReveal key={p.id} index={i}>
                  <ProductCard product={p} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="promo-banner">
        <h2 className="promo-banner__title">Winter Sale — Up to 40% Off</h2>
        <p className="promo-banner__sub">Ends soon. No code needed.</p>
      </section>

      {newArrivals.length > 0 && (
        <section className="section section--tight">
          <div className="container">
            <div className="section__head">
              <div>
                <span className="eyebrow">Just In</span>
                <h2 className="section__title">New Arrivals</h2>
              </div>
              <Link href="/women?sort=newest" className="section__link">
                View All
              </Link>
            </div>
            <div className="grid grid--4">
              {newArrivals.map((p, i) => (
                <ScrollReveal key={p.id} index={i}>
                  <ProductCard product={p} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {trending.length > 0 && (
        <section className="section section--tight">
          <div className="container">
            <div className="section__head">
              <div>
                <span className="eyebrow">Most Loved</span>
                <h2 className="section__title">Trending Now</h2>
              </div>
              <Link href="/men" className="section__link">
                View All
              </Link>
            </div>
            <div className="grid grid--4">
              {trending.map((p, i) => (
                <ScrollReveal key={p.id} index={i}>
                  <ProductCard product={p} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section
        className="promo-banner"
        style={{ background: "var(--color-bg)", borderTop: "1px solid var(--color-border)" }}
      >
        <h2 className="promo-banner__title">Free Worldwide Shipping</h2>
        <p className="promo-banner__sub">On all orders over $75</p>
      </section>

      <section className="newsletter">
        <span className="eyebrow">Stay In Touch</span>
        <h2 className="section__title">Join the VELOUR List</h2>
        <NewsletterForm />
      </section>
    </>
  );
}
