'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Car, List, User } from 'lucide-react'

export default function NavBar() {
    const pathname = usePathname()

    return (
        <div
            className="fixed bottom-0 w-full flex justify-around bg-secondary"
            style={{ userSelect: 'none' }}
        >
            <Link href="/parkings" passHref legacyBehavior>
                <div
                    className={`flex flex-col items-center justify-center w-25 mb-4 mt-1 ${pathname === '/parkings' ? '' : 'text-gray-500'}`}
                >
                    <Car />
                    Парковки
                </div>
            </Link>
            <Link href="/my-spots" passHref legacyBehavior>
                <div
                    className={`flex flex-col items-center justify-center w-25 mb-4 mt-1 ${pathname === '/my-spots' ? '' : 'text-gray-500'}`}
                >
                    <List />
                    Мои места
                </div>
            </Link>
            <Link href="/user-profile" passHref legacyBehavior>
                <div
                    className={`flex flex-col items-center justify-center w-25 mb-4 mt-1 ${pathname === '/user-profile' ? '' : 'text-gray-500'}`}
                >
                    <User />
                    Пользователь
                </div>
            </Link>
        </div>
    )
}