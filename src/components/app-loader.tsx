import { BrandLogo } from "@/components/brand-logo";
import AITextLoading from "@/components/ui/ai-text-loading";
import { cn } from "@/lib/utils";

type AppLoaderProps = {
  texts?: string[];
  className?: string;
};

export function AppLoader({ texts, className }: AppLoaderProps) {
  return (
    <main
      className={cn(
        "flex min-h-[100svh] w-full flex-col items-center justify-center gap-3 px-4 py-8 text-center",
        className,
      )}
    >
      <BrandLogo className="brand-logo-loader" />
      <AITextLoading texts={texts} />
    </main>
  );
}
