type Props = {
  status: string;
};

const steps = [
  "created",
  "accepted",
  "picked_up",
  "delivered",
];

export default function DeliveryTimeline({ status }: Props) {
  const activeIndex = steps.indexOf(status);

  return (
    <div className="flex items-center gap-4 mt-4">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div
            className={`w-4 h-4 rounded-full ${
              i <= activeIndex
                ? "bg-green-600"
                : "bg-gray-300"
            }`}
          />
          <span
            className={`text-xs ${
              i <= activeIndex
                ? "text-green-700"
                : "text-gray-500"
            }`}
          >
            {s.replace("_", " ").toUpperCase()}
          </span>
          {i < steps.length - 1 && (
            <div className="w-8 h-px bg-gray-300" />
          )}
        </div>
      ))}
    </div>
  );
}
