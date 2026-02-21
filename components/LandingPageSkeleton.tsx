export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-white animate-pulse">
      {/* Navigation Skeleton */}
      <nav className="fixed top-0 w-full bg-white shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo Skeleton */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gray-200 rounded-xl" />
              <div className="w-32 h-6 bg-gray-200 rounded" />
            </div>
            
            {/* Menu Skeleton */}
            <div className="hidden md:flex items-center gap-6">
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="w-20 h-4 bg-gray-200 rounded" />
              <div className="w-16 h-4 bg-gray-200 rounded" />
              <div className="w-24 h-10 bg-gray-200 rounded-full" />
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section Skeleton */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-6">
              <div className="w-3/4 h-12 bg-gray-200 rounded" />
              <div className="w-full h-12 bg-gray-200 rounded" />
              <div className="w-full h-20 bg-gray-200 rounded" />
              <div className="flex gap-4">
                <div className="w-40 h-12 bg-gray-200 rounded-full" />
                <div className="w-40 h-12 bg-gray-200 rounded-full" />
              </div>
            </div>
            
            {/* Right Image */}
            <div className="hidden md:block">
              <div className="w-full h-96 bg-gray-200 rounded-3xl" />
            </div>
          </div>
        </div>
      </section>
      
      {/* How It Works Skeleton */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="w-64 h-10 bg-gray-200 rounded mx-auto mb-4" />
            <div className="w-96 h-6 bg-gray-200 rounded mx-auto" />
          </div>
          
          <div className="grid md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-8 rounded-2xl">
                <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-6" />
                <div className="w-32 h-6 bg-gray-200 rounded mx-auto mb-3" />
                <div className="w-full h-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
