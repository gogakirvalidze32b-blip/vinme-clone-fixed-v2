"use client";
import { useState } from "react";

interface SafeImgProps {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
}

export function SafeImg({ src, alt = "", className = "", fallback, style }: SafeImgProps) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return <>{fallback ?? null}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
