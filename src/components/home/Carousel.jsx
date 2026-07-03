import React, { useState, useEffect } from 'react'

const Carousel = () => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  const slides = [
    {
      url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=1920&h=1080&fit=crop&q=80',
      title: 'Smart Waste Management',
      subtitle: 'Revolutionary Technology',
      description: 'Transform your community with intelligent garbage collection powered by QR technology'
    },
    {
      url: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=1920&h=1080&fit=crop&q=80',
      title: 'Eco-Friendly Solutions',
      subtitle: 'Sustainable Future',
      description: 'Building greener communities through smart waste segregation and management'
    },
    {
      url: 'https://images.unsplash.com/photo-1605600659908-0ef719419d41?w=1920&h=1080&fit=crop&q=80',
      title: 'Efficient Collection System',
      subtitle: 'Real-Time Tracking',
      description: 'Monitor and optimize waste collection routes with live GPS tracking and analytics'
    }
  ]

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isAutoPlaying, slides.length])

  const goToSlide = (index) => {
    setCurrentIndex(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + slides.length) % slides.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % slides.length)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000)
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-900">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out ${
            index === currentIndex 
              ? 'opacity-100 scale-100' 
              : 'opacity-0 scale-105'
          }`}
        >
          {/* Background Image with Ken Burns Effect */}
          <div 
            className="absolute inset-0 bg-cover bg-center transition-transform duration-[20000ms] ease-out"
            style={{
              backgroundImage: `url(${slide.url})`,
              transform: index === currentIndex ? 'scale(1.1)' : 'scale(1)'
            }}
          />
          
          {/* Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
          
          {/* Content */}
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="max-w-3xl">
                {/* Subtitle */}
                <div 
                  className={`transition-all duration-1000 delay-300 ${
                    index === currentIndex 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}
                >
                  <span className="inline-block bg-primary-600/90 backdrop-blur-sm text-white px-6 py-2 rounded-full text-sm font-semibold mb-6 shadow-lg">
                    {slide.subtitle}
                  </span>
                </div>

                {/* Title */}
                <h1 
                  className={`text-5xl md:text-7xl font-bold text-white mb-6 leading-tight transition-all duration-1000 delay-500 ${
                    index === currentIndex 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}
                >
                  {slide.title}
                </h1>

                {/* Description */}
                <p 
                  className={`text-xl md:text-2xl text-gray-200 mb-10 leading-relaxed transition-all duration-1000 delay-700 ${
                    index === currentIndex 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}
                >
                  {slide.description}
                </p>

                {/* CTA Buttons */}
                <div 
                  className={`flex flex-col sm:flex-row gap-4 transition-all duration-1000 delay-1000 ${
                    index === currentIndex 
                      ? 'opacity-100 translate-y-0' 
                      : 'opacity-0 translate-y-8'
                  }`}
                >
                  <a 
                    href="#features" 
                    className="inline-flex items-center justify-center bg-primary-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-primary-700 transition-all shadow-2xl hover:shadow-primary-600/50 hover:scale-105 group"
                  >
                    Explore Features
                    <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </a>
                  <a 
                    href="#about" 
                    className="inline-flex items-center justify-center bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-all border-2 border-white/30 hover:border-white/50"
                  >
                    Learn More
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Decorative Elements */}
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white to-transparent"></div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-4 rounded-full transition-all z-20 group border border-white/30"
        aria-label="Previous slide"
      >
        <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 bg-white/20 backdrop-blur-md hover:bg-white/30 text-white p-4 rounded-full transition-all z-20 group border border-white/30"
        aria-label="Next slide"
      >
        <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Indicators */}
      <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex gap-3 z-20">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`transition-all duration-500 rounded-full ${
              index === currentIndex
                ? 'bg-white w-12 h-3'
                : 'bg-white/50 hover:bg-white/75 w-3 h-3'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 animate-bounce">
        <a href="#features" className="text-white/70 hover:text-white transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </a>
      </div>
    </div>
  )
}

export default Carousel