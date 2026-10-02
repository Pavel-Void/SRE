import React from "react"
import withAuth from "@/hoc/WithAuth"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { isYesterday, isToday, isTomorrow, format, isSameDay } from 'date-fns'
import { ru } from 'date-fns/locale'

interface BookedSpot {
    startTime: Date
    endTime: Date
}

interface Props {
    books: BookedSpot[]
}

function BookedList({ books }: Props) {
    const formatDate = (date: Date, isEndTime: boolean = false, startTime?: Date) => {
        const timeString = date.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit' })

        if (startTime && isSameDay(startTime, date) && isEndTime) {
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

    return (
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button variant="outline">
                    Брони на место
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                {books.map((book, index) => {
                    const startDate = new Date(book.startTime)
                    const endDate = new Date(book.endTime)
                    const start = formatDate(startDate)
                    const end = formatDate(endDate, true, startDate)
                    
                    return (
                        <DropdownMenuItem key={index}>
                            {`С ${start} по ${end}`}
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export default withAuth(BookedList)