interface FABProps {
  onClick: () => void;
  label?: string;
}

export default function FAB({ onClick, label = '+' }: FABProps) {
  return (
    // Mirrors the max-w-md container so the button stays inside the card on all screen sizes
    <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto pointer-events-none z-10">
      <button
        onClick={onClick}
        className="absolute bottom-20 right-4 w-14 h-14 bg-gray-900 text-white rounded-full text-2xl shadow-lg flex items-center justify-center pointer-events-auto"
      >
        {label}
      </button>
    </div>
  );
}
