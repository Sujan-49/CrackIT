export function Slider({ min = 0, max = 100, step = 1, value, onValueChange }) {
  const percent = ((value - min) / (max - min)) * 100;

  return (
    <div className="relative py-3">
      <div className="absolute left-0 top-1/2 h-2 w-full -translate-y-1/2 rounded-full bg-white/10" />
      <div
        className="slider-range absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full"
        style={{ width: `${percent}%` }}
      />
      <input
        aria-label="Number of pages"
        className="relative z-10 h-2 w-full cursor-pointer appearance-none bg-transparent accent-[#FF5656]"
        min={min}
        max={max}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onValueChange(Number(event.target.value))}
      />
    </div>
  );
}
