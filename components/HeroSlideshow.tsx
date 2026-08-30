"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface HeroSlideshowProps {
  images: string[];
}

export default function HeroSlideshow({ images }: HeroSlideshowProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((prev) => (prev + 1) % images.length);
    }, 5500);
    return () => clearInterval(id);
  }, [images.length]);

  return (
    <>
      {images.map((src, i) => (
        <div key={src} className={`hero__slide ${i === active ? "is-active" : ""}`}>
          <Image
            src={src}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
          />
        </div>
      ))}
    </>
  );
}
