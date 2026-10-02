'use client'

import React, { useState } from 'react'
import axios from 'axios'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

const apiUrl = process.env.NEXT_PUBLIC_API_URL

export default function LoginForm() {
    const [email, setUserName] = useState('')
    const [password, setPassword] = useState('')
    const router = useRouter()

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()
        try {
            const response = await axios.post(`${apiUrl}/api/login`, { email, password })
            const { token, refreshToken } = response.data
            localStorage.setItem('token', token)
            localStorage.setItem('refreshToken', refreshToken)
            console.log('Login successful')
            router.push('/parkings')
        } catch (error) {
            console.error('Login failed', error)
            toast('Ошибка входа')
            router.push('/autorization')
        }
    }

    return (
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Вход</CardTitle>
                    <CardDescription className="text-gray-500">
                        Введите свои учетные данные
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="space-y-1">
                        <Label htmlFor="email">
                            Логин
                        </Label>
                        <Input
                            type="text"
                            id="email"
                            value={email}
                            onChange={(e) => setUserName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="password">
                            Пароль
                        </Label>
                        <Input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                    <Button type="submit">Войти</Button>
                </CardFooter>
            </Card>
        </form>
    )
}