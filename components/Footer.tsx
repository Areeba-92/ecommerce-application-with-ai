import Link from "next/link";
import { InstagramIcon, FacebookIcon, PinterestIcon } from "@/components/Icons";

const columns = [
  {
    title: "Shop",
    links: [
      { label: "Women", href: "/women" },
      { label: "Men", href: "/men" },
      { label: "New Arrivals", href: "/women?sort=newest" },
      { label: "Best Sellers", href: "/men?sort=newest" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Support & Legal",
    links: [
      { label: "Contact Us", href: "/contact" },
      { label: "Shipping & Returns", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <div className="footer__brand">VELOUR</div>
          <p className="footer__blurb">
            Premium, considered essentials for men &amp; women — quiet luxury
            for everyday wear.
          </p>
          <div className="footer__social">
            <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer">
              <InstagramIcon />
            </a>
            <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer">
              <FacebookIcon />
            </a>
            <a href="https://pinterest.com" aria-label="Pinterest" target="_blank" rel="noreferrer">
              <PinterestIcon />
            </a>
          </div>
        </div>
        {columns.map((col) => (
          <div className="footer__col" key={col.title}>
            <div className="footer__col-title">{col.title}</div>
            {col.links.map((link) => (
              <Link key={link.label} href={link.href}>
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </div>
      <div className="footer__bottom">
        &copy; {new Date().getFullYear()} VELOUR. All rights reserved.
      </div>
    </footer>
  );
}
