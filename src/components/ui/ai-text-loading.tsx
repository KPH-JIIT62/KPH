"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface AITextLoadingProps {
  texts?: string[];
  className?: string;
  interval?: number;
}

const defaultTexts = [
  "Traversing binary trees...",
  "Optimizing to O(log n)...",
  "Resolving hash collisions...",
  "Checking Knuth-Morris-Pratt tables...",
  "Ready to execute...",
];

export default function AITextLoading({
  texts = defaultTexts,
  className,
  interval = 1500,
}: AITextLoadingProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    if (texts.length < 2) return;

    const timer = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, interval);

    return () => clearInterval(timer);
  }, [interval, texts.length]);

  if (texts.length === 0) {
    throw new Error("AITextLoading requires at least one loading message.");
  }

  const currentText = texts[currentTextIndex % texts.length];

  return (
    <div className="flex items-center justify-center p-8" role="status" aria-live="polite">
      <motion.div
        animate={{ opacity: 1 }}
        className="relative w-full px-4 py-2"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTextIndex}
            animate={{
              opacity: 1,
              y: 0,
              backgroundPosition: ["200% center", "-200% center"],
            }}
            exit={{ opacity: 0, y: -20 }}
            initial={{ opacity: 0, y: 20 }}
            className={cn(
              "flex justify-center whitespace-normal bg-[length:200%_100%] bg-gradient-to-r from-neutral-900 via-neutral-400 to-neutral-900 bg-clip-text text-center text-lg font-semibold tracking-tight text-transparent sm:text-2xl dark:from-white dark:via-neutral-600 dark:to-white",
              className,
            )}
            transition={{
              opacity: { duration: 0.3 },
              y: { duration: 0.3 },
              backgroundPosition: {
                duration: 2.5,
                ease: "linear",
                repeat: Number.POSITIVE_INFINITY,
              },
            }}
          >
            {currentText}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
