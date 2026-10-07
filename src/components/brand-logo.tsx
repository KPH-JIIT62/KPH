import Image from "next/image";

type BrandLogoProps = {
  className?: string;
};

export function BrandLogo({ className = "" }: BrandLogoProps) {
  return (
    <span className={`brand-logo ${className}`.trim()}>
      <Image
        src="/images/branding/knuth-logo-dark.png"
        alt="Knuth Programming Hub"
        width={1080}
        height={394}
        className="brand-logo-image brand-logo-light"
      />
      <Image
        src="/images/branding/knuth-logo-light.png"
        alt="Knuth Programming Hub"
        width={1080}
        height={472}
        className="brand-logo-image brand-logo-dark"
      />
      <span className="brand-logo-name">Knuth Programming Hub</span>
    </span>
  );
}
