const LoadingSpinner = ({ size = "large" }) => {
  const sizeClasses = {
    small: "w-8 h-8",
    medium: "w-16 h-16",
    large: "w-24 h-24"
  }

  return (
    <div className="flex items-center justify-center">
      <div className={`${sizeClasses[size]} relative`}>
        {/* Bicycle Wheel */}
        <svg
          className="animate-spin"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Outer rim */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#FFC107"
            strokeWidth="3"
          />
          
          {/* Inner rim */}
          <circle
            cx="50"
            cy="50"
            r="35"
            fill="none"
            stroke="#FFC107"
            strokeWidth="2"
            opacity="0.5"
          />
          
          {/* Hub */}
          <circle
            cx="50"
            cy="50"
            r="8"
            fill="#FFC107"
          />
          
          {/* Spokes */}
          <line x1="50" y1="50" x2="50" y2="5" stroke="#FFC107" strokeWidth="2" />
          <line x1="50" y1="50" x2="85" y2="25" stroke="#FFC107" strokeWidth="2" />
          <line x1="50" y1="50" x2="95" y2="50" stroke="#FFC107" strokeWidth="2" />
          <line x1="50" y1="50" x2="85" y2="75" stroke="#FFC107" strokeWidth="2" />
          <line x1="50" y1="50" x2="50" y2="95" stroke="#FFC107" strokeWidth="2" />
          <line x1="50" y1="50" x2="15" y2="75" stroke="#FFC107" strokeWidth="2" />
          <line x1="50" y1="50" x2="5" y2="50" stroke="#FFC107" strokeWidth="2" />
          <line x1="50" y1="50" x2="15" y2="25" stroke="#FFC107" strokeWidth="2" />
        </svg>
      </div>
    </div>
  )
}

export default LoadingSpinner
