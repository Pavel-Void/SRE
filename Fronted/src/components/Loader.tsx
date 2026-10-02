import React from "react"
import { DotLottieReact } from '@lottiefiles/dotlottie-react'

function Loader() {
    return (
        <div className="flex justify-center items-center h-screen">
            <DotLottieReact
                className="h-16 w-16"
                src="/loading.lottie"
                loop
                autoplay
            />
        </div>
    )
}

export default Loader