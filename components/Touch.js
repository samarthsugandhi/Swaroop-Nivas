"use client";
import { motion } from "framer-motion";
import Link from "next/link";
import { forwardRef } from "react";

// Haptic feedback helper
const vibrate = () => {
  if (typeof window !== "undefined" && navigator.vibrate) {
    navigator.vibrate(10); // Subtle 10ms vibration
  }
};

/**
 * A highly responsive button that scales down instantly on press
 * and triggers a subtle haptic vibration on Android.
 */
export const TouchButton = forwardRef(({ onClick, children, className, disabled, type = "button", ...props }, ref) => {
  return (
    <motion.button
      ref={ref}
      type={type}
      disabled={disabled}
      whileTap={disabled ? {} : { scale: 0.95 }}
      whileHover={disabled ? {} : { scale: 1.02 }}
      onTapStart={() => { if (!disabled) vibrate(); }}
      onClick={onClick}
      className={`${className} touch-manipulation`}
      {...props}
    >
      {children}
    </motion.button>
  );
});
TouchButton.displayName = "TouchButton";

/**
 * A highly responsive Link wrapper.
 */
export const TouchLink = forwardRef(({ href, children, className, onClick, ...props }, ref) => {
  return (
    <Link href={href} passHref legacyBehavior>
      <motion.a
        ref={ref}
        whileTap={{ scale: 0.95 }}
        whileHover={{ scale: 1.02 }}
        onTapStart={vibrate}
        onClick={onClick}
        className={`${className} touch-manipulation block`}
        {...props}
      >
        {children}
      </motion.a>
    </Link>
  );
});
TouchLink.displayName = "TouchLink";

/**
 * A card component that presses in when tapped.
 */
export const TouchCard = forwardRef(({ onClick, children, className, ...props }, ref) => {
  return (
    <motion.div
      ref={ref}
      whileTap={{ scale: 0.97 }}
      onTapStart={vibrate}
      onClick={onClick}
      className={`${className} touch-manipulation ${onClick ? "cursor-pointer" : ""}`}
      {...props}
    >
      {children}
    </motion.div>
  );
});
TouchCard.displayName = "TouchCard";

/**
 * Page transition wrapper to animate page entries.
 */
export function PageTransition({ children, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
