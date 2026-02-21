'use client'

import { useEffect, useRef } from 'react'
import { animate, useInView, useMotionValue, useTransform, motion } from 'framer-motion'

interface NumberTickerProps {
    value: number
    /** Duration in seconds */
    duration?: number
    /** Number of decimal places to show */
    decimals?: number
    className?: string
    /** Prefix string, e.g., '$' */
    prefix?: string
    /** Suffix string, e.g., 'M' or '%' */
    suffix?: string
}

export default function NumberTicker({
    value,
    duration = 1.5,
    decimals = 0,
    className = '',
    prefix = '',
    suffix = '',
}: NumberTickerProps) {
    const ref = useRef<HTMLSpanElement>(null)
    const isInView = useInView(ref, { once: true, margin: '-50px' })
    const count = useMotionValue(0)

    const formatted = useTransform(count, (latest) => {
        return `${prefix}${latest.toLocaleString('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        })}${suffix}`
    })

    useEffect(() => {
        if (isInView) {
            const controls = animate(count, value, { duration, ease: 'easeOut' })
            return controls.stop
        }
    }, [isInView, value, duration, count])

    return (
        <motion.span ref={ref} className={className}>
            {formatted}
        </motion.span>
    )
}
