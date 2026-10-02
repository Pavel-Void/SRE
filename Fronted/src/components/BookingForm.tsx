'use client'

import React, {useEffect, useState} from 'react'
import axios from 'axios'
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
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { Minus, Plus, CalendarIcon } from "lucide-react"
import { toast } from "sonner"
import { SelectSingleEventHandler } from "react-day-picker"
import { useRouter } from "next/navigation"
import BookedList from "@/components/BookedList"
import withAuth from "@/hoc/WithAuth"
import Loader from "@/components/Loader"

const apiUrl = process.env.NEXT_PUBLIC_API_URL

interface BookedSpot {
    startTime: Date
    endTime: Date
}

interface Props {
    placeId: number
    parkingId: number
}

function BookingForm( { placeId, parkingId } : Props ) {
    const router = useRouter()
    const currentDate = new Date()
    currentDate.setSeconds(0, 0)
    const currentTime = currentDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    const [date, setDate] = React.useState<Date>(currentDate)
    const [startTime, setStartTime] = React.useState(currentTime)
    const [parkingTime, setParkingTime] = useState<number>(15)
    const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)
    const [books, setBooks] = useState<BookedSpot[]>([])
    const [loading, setLoading] = useState(true)

    const fetchBooks = async () => {
        try {
            const response = await axios.get<BookedSpot[]>(`${apiUrl}/api/bookedList`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                    params: {
                        parkingId: parkingId,
                        placeId: placeId,
                    },
                }
            )
            setBooks(response.data)
        } catch (error: unknown) {
            if (error instanceof Error) {
                console.error(error.message)
            } else {
                toast('Ошибка бронирования')
                console.error("An unknown error occurred")
            }
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchBooks()
    }, [])

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault()

        if (!date || !startTime) {
            toast.error('Пожалуйста, выберите дату и время')
            return
        }

        const formattedDate = format(
            new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            'yyyy-MM-dd'
        )

        const selectedDateTime = new Date(date.getFullYear(), date.getMonth(), date.getDate())
        selectedDateTime.setHours(parseInt(startTime.split(':')[0]), parseInt(startTime.split(':')[1]))

        const adjustedDateTime = new Date(selectedDateTime);
        adjustedDateTime.setMinutes(adjustedDateTime.getMinutes() + 5);
        if (adjustedDateTime < currentDate) {
            toast.error('Дата и время не могут быть в прошлом')
            return
        }

        try {
            const response = await axios.post(`${apiUrl}/api/booking`, {
                placeId: placeId,
                parkingId: parkingId,
                date: formattedDate,
                start_time: startTime,
                parking_time: parkingTime,
            },
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`,
                    },
                }
            )
            console.log('Booking successful:', response.data)
            router.push('/my-spots')
        } catch (error) {
            console.error('Booking failed:', error)
            toast.error("Место уже занято в это время или")
        }
    }

    function updateParkingTime(adjustment: number) {
        setParkingTime(Math.max(15, Math.min(600, parkingTime + adjustment)))
    }

    function handleStart(adjustment: number) {
        const id = setInterval(() => {
            setParkingTime((prev) => Math.max(15, Math.min(600, prev + adjustment)))
        }, 100)
        setIntervalId(id)
    }

    function handleEnd() {
        if (intervalId) {
            clearInterval(intervalId)
            setIntervalId(null)
        }
    }

    if (loading) {
        return <Loader />
    }

    return(
        <form onSubmit={handleSubmit}>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Бронирование</CardTitle>
                    <CardDescription className="text-gray-500">
                        Выберите дату и время бронирования для парковочного места
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {books.length !== 0 && (
                        <div className="mb-4">
                            <BookedList books={books}/>
                        </div>
                    )}
                    <div className="space-y-1">
                        <Label htmlFor="start_time">
                            Дата
                        </Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        "w-[280px] justify-start text-left font-normal",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon />
                                    {date ? format(date, "PPP") : <span>Выберите дату</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate as SelectSingleEventHandler}
                                    initialFocus
                                    fromDate={new Date()}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="start_time">
                            Время начала
                        </Label>
                        <Input
                            type="time"
                            id="start_time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            required
                            className={cn(
                                "w-[280px] justify-start text-left font-normal",
                                startTime == '' && "text-muted-foreground"
                            )}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="end_time">
                            Время парковки
                        </Label>
                        <div className="flex items-center justify-between space-x-2 w-[60%]">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-full"
                                onClick={() => updateParkingTime(-15)}
                                onTouchStart={() => handleStart(-15)}
                                onTouchEnd={handleEnd}
                                disabled={parkingTime <= 15}
                            >
                                <Minus />
                            </Button>
                            <div className="text-center">
                                <div className="text-3xl font-bold tracking-tighter">
                                    {Math.floor(parkingTime / 60) > 0 ? Math.floor(parkingTime / 60) + ':' : ''}
                                    {parkingTime % 60 === 0 ? '00' : parkingTime % 60}
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 shrink-0 rounded-full"
                                onClick={() => updateParkingTime(+15)}
                                onTouchStart={() => handleStart(+15)}
                                onTouchEnd={handleEnd}
                                disabled={parkingTime >= 600}
                            >
                                <Plus />
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <Button type="submit">
                        Забронировать
                    </Button>
                </CardFooter>
            </Card>
        </form>
    )
}

export default withAuth(BookingForm)