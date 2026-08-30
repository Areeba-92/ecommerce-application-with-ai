"use client";

import { useState } from "react";
import ProductImage from "@/components/ProductImage";

interface GalleryProps {
  images: string[];
  name: string;
}

export default function Gallery({ images, name }: GalleryProps) {
  const [active, setActive] = useState(0);

  return (
    <div>
      <div className="gallery__main">
        <ProductImage
          src={images[active]}
          alt={name}
          width={900}
          height={1200}
          priority
        />
      </div>
      {images.length > 1 && (
        <div className="gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={img + i}
              type="button"
              className={`gallery__thumb ${i === active ? "is-active" : ""}`}
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1} of ${name}`}
            >
              <ProductImage src={img} alt="" width={72} height={96} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
