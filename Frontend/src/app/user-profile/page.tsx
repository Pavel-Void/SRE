'use client'

import React from "react"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import withAuth from "@/hoc/WithAuth"
import { useRouter } from "next/navigation"

function Page() {
    const router = useRouter()

    const handleLogout = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('refreshToken')
        router.push('/autorization')
    }

    return (
            <div
                className="mt-4 ml-4 flex flex-col"
                style={{ userSelect: 'none' }}
            >
                <div className="text-4xl mb-8">Профиль</div>
                <div className="flex align-center mb-5">
                    <Avatar className="size-[100px] mr-4">
                        <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                        <AvatarFallback>CN</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col justify-center">
                        <div className="text-3xl">Пользователь</div>
                        <div className="text-gray-500 text-xl">Описание</div>
                    </div>
                </div>

                <Button
                    className="mb-4 w-80 h-11 text-xl"
                    onClick={handleLogout}
                >
                    Выйти
                </Button>
                {/*<Button className="w-80 h-11 text-xl" variant="secondary">*/}
                {/*    Удалить аккаунт*/}
                {/*</Button>*/}
            </div>
    )
}

export default withAuth(Page)