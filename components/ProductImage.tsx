"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

const FALLBACK_SRC = "/images/placeholder.svg";

/**
 * next/image with a placeholder fallback when the source 404s.
 *
 * The displayed src is derived from props on every render rather than held in
 * state. A previous version did `useState(props.src)`, which only reads its
 * argument on first mount — so when a parent swapped the src on an already
 * mounted instance (the product gallery switching thumbnails) the image was
 * stuck on whichever source it first rendered with.
 *
 * Only the *failed* source is remembered, so a later src is always attempted.
 */
export default function ProductImage(props: ImageProps) {
  const [failedSrc, setFailedSrc] = useState<ImageProps["src"] | null>(null);
  const src = failedSrc === props.src ? FALLBACK_SRC : props.src;

  return <Image {...props} src={src} onError={() => setFailedSrc(props.src)} />;
}
