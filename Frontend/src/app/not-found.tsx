'use client'

import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import Image from 'next/image'

export default function NotFound() {
    const router = useRouter()

    return (
        <div className="flex flex-col items-center justify-center h-screen">
            <h1 className="text-4xl font-bold mb-4">404 - Страница не найдена</h1>
            <Image src="/okak.jpg" width={400} height={400} alt="404 изображение"/>
            <Button
                className="mt-4"
                onClick={() => {router.push("/")}}
            >
                Вернуться на главную
            </Button>
        </div>
    )
}