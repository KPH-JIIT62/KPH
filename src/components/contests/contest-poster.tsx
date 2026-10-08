"use client";

import { useState } from "react";

// The poster for a contest, shown on the right of its page (3:4, portrait).
// There is nothing to configure: put the image in  public/images/contests/  named after the contest's slug, e.g.
//   public/images/contests/encode-26-2.jpg      (.jpeg, .png and .webp work too)
// A contest with no poster file simply shows nothing here. The page looks the same as before.
const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];

export function ContestPoster({ slug, title }: { slug: string; title: string }) {
  const [index, setIndex] = useState(0); // which extension we are trying
  const [loaded, setLoaded] = useState(false);
  if (index >= EXTENSIONS.length) return null; // no poster file for this contest

  return (
    // Hidden until the image has really loaded, so a contest without a poster never flashes an empty frame.
    <figure className="contest-poster" hidden={!loaded}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={index}
        src={`/images/contests/${encodeURIComponent(slug)}.${EXTENSIONS[index]}`}
        alt={`${title} poster`}
        onLoad={() => setLoaded(true)}
        onError={() => setIndex((current) => current + 1)}
      />
    </figure>
  );
}
