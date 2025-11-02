"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { MessageCircle } from "lucide-react";
import Image from "next/image";

interface ChatButtonProps {
  isExpanded: boolean;
  onClick: () => void;
}

const MASCOT_IMAGES = [
  "/mascot.webp",
  "/3.webp",
  "/4.webp",
  "/5.webp",
] as const;

export function ChatButton({ isExpanded, onClick }: ChatButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [mascotImage, setMascotImage] = useState<string>("/mascot.webp");

  // Select random mascot on client side only to avoid hydration mismatch
  useEffect(() => {
    const randomImage =
      MASCOT_IMAGES[Math.floor(Math.random() * MASCOT_IMAGES.length)]!;
    setMascotImage(randomImage);
  }, []);

  return (
    <motion.button
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="relative h-20 w-20"
      aria-label={isExpanded ? "Collapse chat" : "Open chat"}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.8, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Idle floating animation wrapper */}
      <motion.div
        animate={!isHovered && !isExpanded ? { y: [-2, 2, -2] } : { y: 0 }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative h-full w-full"
      >
        {/* Circular mascot image container */}
        <div className="relative h-full w-full overflow-hidden rounded-full shadow-lg">
          <Image
            src={mascotImage}
            alt="Chat mascot"
            fill
            className="object-cover"
            sizes="80px"
          />

          {/* Hover glow effect */}
          {isHovered && (
            <motion.div
              className="absolute inset-0 rounded-full bg-white/20"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* Chat icon badge positioned outside the circle */}
        <div className="absolute -top-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow-lg ring-2 ring-white">
          <MessageCircle
            size={16}
            className="text-[#35C1B9]"
            strokeWidth={2.5}
          />
        </div>
      </motion.div>
    </motion.button>
  );
}
