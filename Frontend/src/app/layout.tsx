'use client'

import { usePathname } from 'next/navigation'
import "./globals.css"
import "../components/NavBar"
import NavBar from "@/components/NavBar"
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({ children, }: Readonly<{  children: React.ReactNode }>) {
    const pathname = usePathname()
    const hideNavBar = pathname === '/autorization'

    return (
    <html lang="en">
        <head>
            <title>Park PSU</title>
            <link rel="manifest" href="/manifest.json" />
            <link rel="icon" href="/amnyam.png" />
            <meta name="theme-color" content="#000000" />
        </head>
        <body>
            {children}
            {!hideNavBar && <NavBar />}
            <Toaster />
        </body>
    </html>
    )
}
