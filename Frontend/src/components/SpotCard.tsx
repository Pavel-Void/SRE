'use client'

import React, { useState, useEffect } from 'react'
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { isYesterday, isToday, isTomorrow, format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'
import {toast} from "sonner"
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer"
import axios from "axios"
import {Button} from "@/components/ui/button"

interface Props {
    parkingId: number
    spotId: number
    title: string
    location: string
    startTime: Date
    endTime: Date
    onDelete: () => void
}

const updateTime = 20000 // В миллисекундах
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

export default function SpotCard({ title, location, endTime, startTime, parkingId, spotId, onDelete } : Props) {
    const [currentDate, setCurrentDate] = useState<Date>(new Date())
    const [parkingTime] = useState<number>(Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60)))
    const [parked, setParked] = useState<number>(Math.floor((currentDate.getTime() - startTime.getTime()) / (1000 * 60)))
    const [timeRemaining, setTimeRemaining] = useState<number>(Math.floor((endTime.getTime() - currentDate.getTime()) / (1000 * 60)))
    const [percent, setPercent] = useState<number>(parked / parkingTime * 100)
    const [isDrawerOpen, setIsDrawerOpen] = useState(false)

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date()
            now.setSeconds(0, 0)
            setCurrentDate(now)
            setParked(Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60)))
            setTimeRemaining(Math.floor((endTime.getTime() - now.getTime()) / (1000 * 60)))
            setPercent((Math.floor((now.getTime() - startTime.getTime()) / (1000 * 60))) / parkingTime * 100)
        }, updateTime)

        return () => clearInterval(interval)
    }, [startTime, endTime, parkingTime])

    const toggleDrawer = () => {
        setIsDrawerOpen(!isDrawerOpen)
    }

    const handleSubmit = async (event: React.FormEvent, spotId: number, parkingId: number, startTime: Date) => {
        try {
            const formattedStartTime = format(startTime, "yyyy-MM-dd'T'HH:mm:ss")

            const response = await axios.post(`${apiUrl}/api/cancelBooking`, {
                spotId: spotId,
                parkingId: parkingId,
                startTime: formattedStartTime,
            }, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            })
            console.log("Booking cancelled successfully", response.data)
            onDelete()
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error cancelling booking:", error.message)
            } else {
                console.error("An unknown error occurred while cancelling booking")
                toast('Ошибка отмены бронирования')
            }
        }
    }

    const formatDate = (date: Date, isEndTime: boolean = false) => {
        const timeString = date.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })

        if (isSameDay(startTime, endTime) && isEndTime) {
            return timeString
        }

        if (isToday(date)) {
            return `Сегодня, ${timeString}`
        }
        if (isYesterday(date)) {
            return `Вчера, ${timeString}`
        }
        if (isTomorrow(date)) {
            return `Завтра, ${timeString}`
        }

        return `${format(date, 'd MMMM', { locale: ru })}, ${timeString}`
    }

    const start = formatDate(startTime)
    const end = formatDate(endTime, true)

    return (
        <Card
            className={`w-full h-content mb-4 mr-4 flex justify-center ${percent < 0 ? 'bg-gray-200' : ''}`}
            onClick={toggleDrawer}
        >
            <div className="flex align-center justify-between ml-5 mr-5">
                <div className="text-2xl">
                    {title}
                </div>
                <div className="text-gray-500 flex items-center">
                    {location}
                </div>
            </div>
            <div className="flex align-center justify-between ml-5 mr-5">
                <div>
                    {start}
                </div>
                <div>
                    {end}
                </div>
            </div>
            <div className="flex justify-center">
                <Progress
                    className="w-[90%]"
                    value={percent}
                />
            </div>
            <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>{title}</DrawerTitle>
                        <DrawerDescription>
                            {location}
                        </DrawerDescription>
                    </DrawerHeader>
                    <div className="flex flex-col items-center justify-center mt-4">
                        Осталось времени: {timeRemaining >= 60 ? Math.floor(timeRemaining / 60) + ":" + timeRemaining % 60 : timeRemaining}
                    </div>
                    <DrawerFooter>
                        <Button onClick={(e) => handleSubmit(e, spotId, parkingId, startTime)}>
                            Отменить бронь
                        </Button>
                        <DrawerClose>
                            <Button variant="outline" className="w-full">
                                Закрыть
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </Card>
    )
}