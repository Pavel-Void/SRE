import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import LoginForm from "@/components/LoginForm"
import RegisterForm from "@/components/RegisterForm"

export default function Autorization() {
    return (
        <div className="flex items-center justify-center w-full h-screen">
            <Tabs defaultValue="login" className="w-[350px]">
                <TabsList className="grid w-full grid-cols-2 h-[42px]">
                    <TabsTrigger value="login">Вход</TabsTrigger>
                    <TabsTrigger value="registration">Регистрация</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <LoginForm />
                </TabsContent>
                <TabsContent value="registration">
                    <RegisterForm />
                </TabsContent>
            </Tabs>
        </div>
    )
}
