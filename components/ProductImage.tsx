"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

const FALLBACK_SRC = "/images/placeholder.svg";

export default function ProductImage(props: ImageProps) {
  const [src, setSrc] = useState(props.src);

  return (
    <Image
      {...props}
      src={src}
      onError={() => setSrc(FALLBACK_SRC)}
    />
  );
}
