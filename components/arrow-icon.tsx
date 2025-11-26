"use client"

import React from "react"
import { ArrowRight } from "lucide-react"

interface ArrowIconProps {
  color?: string
  thickness?: number
  className?: string
}

export function ArrowIcon({ color = "#3b82f6", thickness = 4, className }: ArrowIconProps) {
  // Use lucide-react props for consistent rendering (strokeWidth prop is supported)
  return <ArrowRight className={className} color={color} strokeWidth={thickness} />
}

export default ArrowIcon
