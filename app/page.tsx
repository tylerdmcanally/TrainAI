import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 flex items-center justify-center p-8">
      <Card className="max-w-2xl p-12 text-center">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          TrainAI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          AI-Powered Interactive Employee Training Platform
        </p>
        <div className="space-y-4 mb-8">
          <div className="flex items-start gap-4 text-left">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <span className="text-blue-600 font-semibold">1</span>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Create training in 10 minutes</h3>
              <p className="text-gray-600 text-sm">Record your screen, talk naturally. AI handles the rest.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 text-left">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <span className="text-purple-600 font-semibold">2</span>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Employees learn faster</h3>
              <p className="text-gray-600 text-sm">AI tutor asks questions, answers doubts, keeps them engaged.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 text-left">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <span className="text-green-600 font-semibold">3</span>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Track progress automatically</h3>
              <p className="text-gray-600 text-sm">Know who completed training and how they're doing.</p>
            </div>
          </div>
        </div>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg">Get Started Free</Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline">Log In</Button>
          </Link>
        </div>
        <p className="mt-8 text-sm text-gray-500">
          ✅ Database configured • APIs ready • UI built
        </p>
      </Card>
    </div>
  )
}
