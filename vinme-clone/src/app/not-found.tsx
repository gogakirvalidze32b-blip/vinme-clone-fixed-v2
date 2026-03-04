export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-gray-500 mt-2">გვერდი ვერ მოიძებნა</p>
      <a href="/" className="mt-4 text-pink-500 hover:underline">
        მთავარ გვერდზე დაბრუნება
      </a>
    </div>
  )
}