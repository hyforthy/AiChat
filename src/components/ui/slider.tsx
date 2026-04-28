import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-[3px] w-full grow rounded-full" style={{ backgroundColor: "var(--color-border)" }}>
      <SliderPrimitive.Range className="absolute h-full rounded-full" style={{ backgroundColor: "var(--color-accent)" }} />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-3.5 w-3.5 rounded-full border border-[var(--color-accent)] bg-[var(--color-accent)] transition-transform focus-visible:outline-none focus-visible:scale-110 disabled:pointer-events-none disabled:opacity-50 cursor-pointer" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
